/**
 * Tana Publish page scraper for read-only context
 * Allows scraping public Tana Publish pages to provide read access
 */

import axios from 'axios';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface PublishPageConfig {
  slug: string;
  url: string;
  title?: string;
  lastScraped?: string;
  scrapeInterval?: number; // minutes, default 60
  enabled: boolean;
}

export interface PublishPageContent {
  slug: string;
  title: string;
  content: string;
  lastScraped: string;
  url: string;
  wordCount: number;
}

export class PublishScraper {
  private readonly configPath: string;
  private readonly contentDir: string;
  private config: PublishPageConfig[] = [];
  private initialized = false;

  constructor(configPath?: string, contentDir?: string) {
    this.configPath = configPath || join(process.cwd?.() || '.', 'tana-publish-config.json');
    this.contentDir = contentDir || join(process.cwd?.() || '.', 'tana-publish-content');
  }

  /**
   * Initialize the scraper, loading config and ensuring directories exist
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load configuration
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(data);
    } catch (error) {
      // Config doesn't exist, start with empty
      this.config = [];
    }

    // Ensure content directory exists
    try {
      await fs.mkdir(this.contentDir, { recursive: true });
    } catch (error) {
      // Directory exists or can't be created
    }

    this.initialized = true;
  }

  /**
   * Add a new publish page to monitor
   */
  async addPublishPage(slug: string, url: string, options: { title?: string; scrapeInterval?: number } = {}): Promise<void> {
    await this.initialize();

    // Validate URL format
    if (!this.isValidTanaPublishUrl(url)) {
      throw new Error('Invalid Tana Publish URL format');
    }

    // Check if slug already exists
    const existing = this.config.find(p => p.slug === slug);
    if (existing) {
      throw new Error(`Publish page with slug '${slug}' already exists`);
    }

    const publishPage: PublishPageConfig = {
      slug,
      url,
      title: options.title,
      scrapeInterval: options.scrapeInterval || 60,
      enabled: true
    };

    this.config.push(publishPage);
    await this.saveConfig();

    // Perform initial scrape
    await this.scrapePage(slug);
  }

  /**
   * Remove a publish page
   */
  async removePublishPage(slug: string): Promise<void> {
    await this.initialize();

    this.config = this.config.filter(p => p.slug !== slug);
    await this.saveConfig();

    // Remove cached content
    try {
      await fs.unlink(join(this.contentDir, `${slug}.json`));
    } catch (error) {
      // File doesn't exist
    }
  }

  /**
   * Enable/disable a publish page
   */
  async togglePublishPage(slug: string, enabled: boolean): Promise<void> {
    await this.initialize();

    const page = this.config.find(p => p.slug === slug);
    if (!page) {
      throw new Error(`Publish page with slug '${slug}' not found`);
    }

    page.enabled = enabled;
    await this.saveConfig();
  }

  /**
   * Scrape a specific publish page
   */
  async scrapePage(slug: string, force = false): Promise<PublishPageContent> {
    await this.initialize();

    const pageConfig = this.config.find(p => p.slug === slug);
    if (!pageConfig) {
      throw new Error(`Publish page with slug '${slug}' not found`);
    }

    if (!pageConfig.enabled && !force) {
      throw new Error(`Publish page with slug '${slug}' is disabled`);
    }

    // Check if we need to scrape based on interval
    if (!force && pageConfig.lastScraped && pageConfig.scrapeInterval) {
      const lastScraped = new Date(pageConfig.lastScraped);
      const now = new Date();
      const intervalMs = pageConfig.scrapeInterval * 60 * 1000;
      
      if (now.getTime() - lastScraped.getTime() < intervalMs) {
        // Return cached content if within interval
        return await this.getCachedContent(slug);
      }
    }

    try {
      // Scrape the page
      const response = await axios.get(pageConfig.url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Tana-MCP-Server/1.2.0 (read-like resources)'
        }
      });

      // Extract content from HTML
      const content = this.extractContentFromHtml(response.data);
      const title = pageConfig.title || this.extractTitleFromHtml(response.data) || slug;

      const pageContent: PublishPageContent = {
        slug,
        title,
        content,
        lastScraped: new Date().toISOString(),
        url: pageConfig.url,
        wordCount: content.split(/\s+/).length
      };

      // Update last scraped time
      pageConfig.lastScraped = pageContent.lastScraped;
      await this.saveConfig();

      // Cache the content
      await this.cacheContent(pageContent);

      return pageContent;
    } catch (error) {
      throw new Error(`Failed to scrape publish page '${slug}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get cached content for a page
   */
  async getCachedContent(slug: string): Promise<PublishPageContent> {
    await this.initialize();

    try {
      const contentPath = join(this.contentDir, `${slug}.json`);
      const data = await fs.readFile(contentPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`No cached content found for slug '${slug}'`);
    }
  }

  /**
   * Get all configured publish pages
   */
  async getPublishPages(): Promise<PublishPageConfig[]> {
    await this.initialize();
    return [...this.config];
  }

  /**
   * Scrape all enabled pages that are due for scraping
   */
  async scrapeAllDue(): Promise<PublishPageContent[]> {
    await this.initialize();

    const results: PublishPageContent[] = [];
    
    for (const pageConfig of this.config) {
      if (!pageConfig.enabled) continue;

      try {
        // Check if due for scraping
        if (pageConfig.lastScraped && pageConfig.scrapeInterval) {
          const lastScraped = new Date(pageConfig.lastScraped);
          const now = new Date();
          const intervalMs = pageConfig.scrapeInterval * 60 * 1000;
          
          if (now.getTime() - lastScraped.getTime() < intervalMs) {
            continue; // Not due yet
          }
        }

        const content = await this.scrapePage(pageConfig.slug);
        results.push(content);
      } catch (error) {
        console.error(`Failed to scrape page ${pageConfig.slug}:`, error);
      }
    }

    return results;
  }

  /**
   * Validate if URL is a Tana Publish URL
   */
  private isValidTanaPublishUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('tana.pub') || 
             urlObj.hostname.includes('tana.inc') && urlObj.pathname.includes('/pub/');
    } catch {
      return false;
    }
  }

  /**
   * Extract title from HTML
   */
  private extractTitleFromHtml(html: string): string | null {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
    
    // Try meta title
    const metaTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
    if (metaTitleMatch) {
      return metaTitleMatch[1].trim();
    }

    return null;
  }

  /**
   * Extract readable content from HTML
   */
  private extractContentFromHtml(html: string): string {
    // Remove script and style tags
    let content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Remove HTML tags but keep line breaks for readability
    content = content.replace(/<br[^>]*>/gi, '\n');
    content = content.replace(/<\/?(p|div|h[1-6]|li)[^>]*>/gi, '\n');
    content = content.replace(/<[^>]+>/g, '');
    
    // Decode HTML entities
    content = content.replace(/&lt;/g, '<');
    content = content.replace(/&gt;/g, '>');
    content = content.replace(/&amp;/g, '&');
    content = content.replace(/&quot;/g, '"');
    content = content.replace(/&#39;/g, "'");
    content = content.replace(/&nbsp;/g, ' ');
    
    // Clean up whitespace
    content = content.replace(/\n\s*\n/g, '\n\n'); // Multiple newlines to double
    content = content.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space
    content = content.trim();
    
    return content;
  }

  /**
   * Save configuration to disk
   */
  private async saveConfig(): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save publish config:', error);
    }
  }

  /**
   * Cache content to disk
   */
  private async cacheContent(content: PublishPageContent): Promise<void> {
    try {
      const contentPath = join(this.contentDir, `${content.slug}.json`);
      await fs.writeFile(contentPath, JSON.stringify(content, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to cache publish content:', error);
    }
  }
}