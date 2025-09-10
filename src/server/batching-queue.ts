/**
 * Batching Queue for Tana API Requests
 * Handles rate limiting, payload size validation, node count tracking, and batching
 */

import { TanaAPIRequest, TanaAPIResponse, TanaCreateNodesRequest } from '../types/tana-api';

interface QueuedRequest {
  id: string;
  request: TanaAPIRequest;
  resolve: (value: TanaAPIResponse) => void;
  reject: (error: Error) => void;
  timestamp: number;
  retryCount: number;
}

interface BatchingOptions {
  maxNodesPerRequest: number;
  maxPayloadSize: number;
  maxWorkspaceNodes: number;
  rateLimit: number; // requests per second
  maxRetries: number;
  baseBackoffMs: number;
}

export class BatchingQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private totalNodeCount = 0;
  private options: BatchingOptions;
  private requestId = 0;

  constructor(options: Partial<BatchingOptions> = {}) {
    this.options = {
      maxNodesPerRequest: 100,
      maxPayloadSize: 5000,
      maxWorkspaceNodes: 750000,
      rateLimit: 1, // 1 request per second
      maxRetries: 3,
      baseBackoffMs: 1000,
      ...options
    };
  }

  /**
   * Add a request to the queue
   */
  async enqueue(request: TanaAPIRequest): Promise<TanaAPIResponse> {
    // Estimate nodes that will be created by this request
    const estimatedNewNodes = this.isCreateNodesRequest(request) ? request.nodes.length : 0;
    
    // Check workspace node limit including this request
    if (this.totalNodeCount + estimatedNewNodes > this.options.maxWorkspaceNodes) {
      throw new Error(
        `Creating ${estimatedNewNodes} nodes would exceed the workspace limit of ${this.options.maxWorkspaceNodes} nodes. ` +
        `Current count: ${this.totalNodeCount}. Please archive or delete some nodes before creating new ones.`
      );
    }

    // Validate payload size
    const payloadSize = JSON.stringify(request).length;
    if (payloadSize > this.options.maxPayloadSize) {
      throw new Error(
        `Request payload size (${payloadSize} chars) exceeds the maximum allowed size of ${this.options.maxPayloadSize} chars. ` +
        'Please reduce the amount of content or split into multiple requests.'
      );
    }

    // For createNodes requests, validate node count and potentially split
    if (this.isCreateNodesRequest(request) && request.nodes.length > this.options.maxNodesPerRequest) {
      return this.handleLargeCreateRequest(request);
    }

    return new Promise<TanaAPIResponse>((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: `req_${++this.requestId}`,
        request,
        resolve,
        reject,
        timestamp: Date.now(),
        retryCount: 0
      };

      this.queue.push(queuedRequest);
      this.processQueue();
    });
  }

  /**
   * Process the queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      const minInterval = 1000 / this.options.rateLimit; // ms between requests

      // Rate limiting - wait if needed
      if (timeSinceLastRequest < minInterval) {
        const waitTime = minInterval - timeSinceLastRequest;
        await this.sleep(waitTime);
      }

      const queuedRequest = this.queue.shift();
      if (!queuedRequest) break;

      try {
        // This will be called by the actual HTTP client
        const response = await this.executeRequest(queuedRequest);
        
        // Update node count tracking
        this.updateNodeCount(queuedRequest.request, response);
        
        this.lastRequestTime = Date.now();
        queuedRequest.resolve(response);
      } catch (error) {
        await this.handleRequestError(queuedRequest, error as Error);
      }
    }

    this.processing = false;
  }

  /**
   * Handle large createNodes requests by splitting them
   */
  private async handleLargeCreateRequest(request: TanaCreateNodesRequest): Promise<TanaAPIResponse> {
    const chunks = this.chunkNodes(request.nodes, this.options.maxNodesPerRequest);
    const allResponses: TanaAPIResponse[] = [];

    for (const chunk of chunks) {
      const chunkRequest: TanaCreateNodesRequest = {
        ...request,
        nodes: chunk
      };
      
      const response = await this.enqueue(chunkRequest);
      allResponses.push(response);
    }

    // Combine all responses
    return this.combineResponses(allResponses);
  }

  /**
   * Split nodes into chunks
   */
  private chunkNodes<T>(nodes: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < nodes.length; i += chunkSize) {
      chunks.push(nodes.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Combine multiple API responses
   */
  private combineResponses(responses: TanaAPIResponse[]): TanaAPIResponse {
    const combined: TanaAPIResponse = {
      children: []
    };

    for (const response of responses) {
      if (response.children) {
        combined.children = (combined.children || []).concat(response.children);
      }
    }

    return combined;
  }

  /**
   * Handle request errors with exponential backoff
   */
  private async handleRequestError(queuedRequest: QueuedRequest, error: Error): Promise<void> {
    queuedRequest.retryCount++;

    if (queuedRequest.retryCount <= this.options.maxRetries) {
      // Exponential backoff
      const backoffTime = this.options.baseBackoffMs * Math.pow(2, queuedRequest.retryCount - 1);
      await this.sleep(backoffTime);
      
      // Re-queue the request
      this.queue.unshift(queuedRequest);
    } else {
      // Max retries exceeded
      const enhancedError = new Error(
        `Request failed after ${this.options.maxRetries} retries: ${error.message}`
      );
      queuedRequest.reject(enhancedError);
    }
  }

  /**
   * Update node count based on the request and response
   */
  private updateNodeCount(request: TanaAPIRequest, response: TanaAPIResponse): void {
    if (this.isCreateNodesRequest(request)) {
      // Add nodes created
      const nodesCreated = response.children?.length || 0;
      this.totalNodeCount += nodesCreated;
    }
    // Note: setNodeName doesn't change node count
  }

  /**
   * Type guard for CreateNodesRequest
   */
  private isCreateNodesRequest(request: TanaAPIRequest): request is TanaCreateNodesRequest {
    return 'nodes' in request;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * This method will be overridden by the actual HTTP executor
   */
  private async executeRequest(queuedRequest: QueuedRequest): Promise<TanaAPIResponse> {
    throw new Error('executeRequest must be implemented by the HTTP client');
  }

  /**
   * Set the HTTP executor function
   */
  setHttpExecutor(executor: (request: TanaAPIRequest) => Promise<TanaAPIResponse>): void {
    this.executeRequest = async (queuedRequest: QueuedRequest): Promise<TanaAPIResponse> => {
      return executor(queuedRequest.request);
    };
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      totalNodeCount: this.totalNodeCount,
      lastRequestTime: this.lastRequestTime
    };
  }

  /**
   * Reset node count (useful for testing or workspace changes)
   */
  resetNodeCount(): void {
    this.totalNodeCount = 0;
  }

  /**
   * Update node count manually (for initialization from existing workspace)
   */
  setNodeCount(count: number): void {
    this.totalNodeCount = Math.max(0, count);
  }
}