/**
 * Local mirror storage for tracking nodes created by this MCP server
 * Provides read-like functionality by maintaining a local index of written data
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { TanaNode } from '../types/tana-api';

export interface MirrorEntry {
  id?: string;
  nodeData: TanaNode;
  targetNodeId?: string;
  timestamp: string;
  supertags?: string[];
  category?: string; // derived from supertags for easy querying
}

export interface MirrorQueryOptions {
  category?: string;
  supertag?: string;
  since?: string; // ISO date string
  limit?: number;
}

export class MirrorStorage {
  private readonly storagePath: string;
  private cache: MirrorEntry[] = [];
  private initialized = false;

  constructor(storagePath?: string) {
    this.storagePath = storagePath || join(process.cwd?.() || '.', 'tana-mirror.json');
  }

  /**
   * Initialize the storage, loading existing data
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      this.cache = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty cache
      this.cache = [];
    }

    this.initialized = true;
  }

  /**
   * Store a node entry in the mirror
   */
  async storeNode(nodeData: TanaNode, targetNodeId?: string, resultId?: string): Promise<void> {
    await this.initialize();

    const entry: MirrorEntry = {
      id: resultId,
      nodeData,
      targetNodeId,
      timestamp: new Date().toISOString(),
      supertags: this.extractSupertags(nodeData),
      category: this.deriveCategory(nodeData)
    };

    this.cache.push(entry);
    await this.persist();
  }

  /**
   * Query nodes from the mirror
   */
  async queryNodes(options: MirrorQueryOptions = {}): Promise<MirrorEntry[]> {
    await this.initialize();

    let results = [...this.cache];

    // Filter by category
    if (options.category) {
      results = results.filter(entry => entry.category === options.category);
    }

    // Filter by supertag
    if (options.supertag) {
      results = results.filter(entry => 
        entry.supertags?.includes(options.supertag!)
      );
    }

    // Filter by date
    if (options.since) {
      const sinceDate = new Date(options.since);
      results = results.filter(entry => 
        new Date(entry.timestamp) >= sinceDate
      );
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get all unique categories
   */
  async getCategories(): Promise<string[]> {
    await this.initialize();
    const categories = new Set(this.cache.map(entry => entry.category).filter(Boolean) as string[]);
    return Array.from(categories);
  }

  /**
   * Get all unique supertags
   */
  async getSupertags(): Promise<string[]> {
    await this.initialize();
    const supertags = new Set<string>();
    this.cache.forEach(entry => {
      entry.supertags?.forEach(tag => supertags.add(tag));
    });
    return Array.from(supertags);
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{ totalNodes: number; categories: number; oldestEntry?: string; newestEntry?: string }> {
    await this.initialize();
    
    const timestamps = this.cache.map(entry => entry.timestamp).sort();
    const categories = await this.getCategories();

    return {
      totalNodes: this.cache.length,
      categories: categories.length,
      oldestEntry: timestamps[0],
      newestEntry: timestamps[timestamps.length - 1]
    };
  }

  /**
   * Clear all stored data
   */
  async clear(): Promise<void> {
    this.cache = [];
    await this.persist();
  }

  /**
   * Extract supertag IDs from node data
   */
  private extractSupertags(nodeData: TanaNode): string[] {
    if ('supertags' in nodeData && nodeData.supertags) {
      return nodeData.supertags.map(tag => tag.id);
    }
    return [];
  }

  /**
   * Derive a category name from the node data for easier querying
   */
  private deriveCategory(nodeData: TanaNode): string {
    // Check for boolean nodes (often tasks)
    if ('dataType' in nodeData && nodeData.dataType === 'boolean') {
      return 'tasks';
    }

    // Check for date nodes
    if ('dataType' in nodeData && nodeData.dataType === 'date') {
      return 'dates';
    }

    // Check for URL nodes
    if ('dataType' in nodeData && nodeData.dataType === 'url') {
      return 'urls';
    }

    // Check for file nodes
    if ('dataType' in nodeData && nodeData.dataType === 'file') {
      return 'files';
    }

    // Check for reference nodes
    if ('dataType' in nodeData && nodeData.dataType === 'reference') {
      return 'references';
    }

    // Check for field nodes
    if ('type' in nodeData && nodeData.type === 'field') {
      return 'fields';
    }

    // Check for specific supertags that indicate categories
    if ('supertags' in nodeData && nodeData.supertags) {
      for (const supertag of nodeData.supertags) {
        // Common supertag patterns
        if (supertag.id === 'SYS_T01') return 'supertags';
        if (supertag.id === 'SYS_T02') return 'fields';
        
        // If we have a name for the supertag in fields, use that
        if (supertag.fields) {
          const fieldKeys = Object.keys(supertag.fields);
          if (fieldKeys.includes('priority') || fieldKeys.includes('due')) {
            return 'tasks';
          }
          if (fieldKeys.includes('project') || fieldKeys.includes('milestone')) {
            return 'projects';
          }
          if (fieldKeys.includes('person') || fieldKeys.includes('email')) {
            return 'people';
          }
        }
      }
    }

    // Default to general notes
    return 'notes';
  }

  /**
   * Persist the cache to disk
   */
  private async persist(): Promise<void> {
    try {
      await fs.writeFile(this.storagePath, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to persist mirror storage:', error);
    }
  }
}