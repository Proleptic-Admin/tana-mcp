/**
 * Input Validation and Normalization
 * Validates and normalizes user inputs based on field types and validation rules
 */

import { z } from 'zod';
import { SchemaField, SchemaConfig } from '../types/schema-config';

export interface ValidationResult {
  isValid: boolean;
  normalizedValue: any;
  errors: string[];
}

export interface ValidationOptions {
  strictMode?: boolean;
  dateFormat?: 'iso' | 'flexible';
  urlRequireProtocol?: boolean;
}

export class InputValidator {
  private options: ValidationOptions;

  constructor(options: ValidationOptions = {}) {
    this.options = {
      strictMode: false,
      dateFormat: 'iso',
      urlRequireProtocol: true,
      ...options
    };
  }

  /**
   * Validate and normalize a single field value
   */
  validateField(value: any, field: SchemaField): ValidationResult {
    const errors: string[] = [];
    let normalizedValue = value;

    // Check if required field is missing
    if (field.required && (value === undefined || value === null || value === '')) {
      return {
        isValid: false,
        normalizedValue: null,
        errors: [`Field '${field.name}' is required`]
      };
    }

    // If value is empty and not required, return default or null
    if (value === undefined || value === null || value === '') {
      normalizedValue = field.defaultValue || null;
      return {
        isValid: true,
        normalizedValue,
        errors: []
      };
    }

    // Type-specific validation and normalization
    switch (field.type) {
      case 'text':
        normalizedValue = this.validateText(value, field, errors);
        break;
      case 'date':
        normalizedValue = this.validateDate(value, field, errors);
        break;
      case 'url':
        normalizedValue = this.validateUrl(value, field, errors);
        break;
      case 'boolean':
        normalizedValue = this.validateBoolean(value, field, errors);
        break;
      case 'number':
        normalizedValue = this.validateNumber(value, field, errors);
        break;
      case 'reference':
        normalizedValue = this.validateReference(value, field, errors);
        break;
      default:
        errors.push(`Unknown field type: ${field.type}`);
    }

    // Apply custom validation rules
    if (field.validation && normalizedValue !== null) {
      this.applyCustomValidation(normalizedValue, field, errors);
    }

    return {
      isValid: errors.length === 0,
      normalizedValue,
      errors
    };
  }

  /**
   * Validate and normalize multiple fields
   */
  validateFields(values: Record<string, any>, fields: SchemaField[]): {
    isValid: boolean;
    normalizedValues: Record<string, any>;
    errors: Record<string, string[]>;
  } {
    const normalizedValues: Record<string, any> = {};
    const errors: Record<string, string[]> = {};
    let allValid = true;

    for (const field of fields) {
      const result = this.validateField(values[field.name], field);
      
      if (!result.isValid) {
        allValid = false;
        errors[field.name] = result.errors;
      }
      
      if (result.normalizedValue !== null) {
        normalizedValues[field.name] = result.normalizedValue;
      }
    }

    return {
      isValid: allValid,
      normalizedValues,
      errors
    };
  }

  /**
   * Validate text field
   */
  private validateText(value: any, field: SchemaField, errors: string[]): string | null {
    if (typeof value !== 'string') {
      value = String(value);
    }

    const text = value.trim();

    // Length validation
    if (field.validation?.min && text.length < field.validation.min) {
      errors.push(`'${field.name}' must be at least ${field.validation.min} characters long`);
    }

    if (field.validation?.max && text.length > field.validation.max) {
      errors.push(`'${field.name}' must not exceed ${field.validation.max} characters`);
    }

    return text;
  }

  /**
   * Validate and normalize date field
   */
  private validateDate(value: any, field: SchemaField, errors: string[]): string | null {
    if (typeof value !== 'string') {
      value = String(value);
    }

    const dateStr = value.trim();

    if (this.options.dateFormat === 'iso') {
      // Strict ISO 8601 validation
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
      if (!isoDateRegex.test(dateStr)) {
        errors.push(`'${field.name}' must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)`);
        return null;
      }
    } else {
      // Flexible date parsing
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        errors.push(`'${field.name}' is not a valid date`);
        return null;
      }
      
      // Normalize to ISO format
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    // Additional date validation
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      errors.push(`'${field.name}' is not a valid date`);
      return null;
    }

    return dateStr;
  }

  /**
   * Validate and normalize URL field
   */
  private validateUrl(value: any, field: SchemaField, errors: string[]): string | null {
    if (typeof value !== 'string') {
      value = String(value);
    }

    let url = value.trim();

    // Add protocol if missing and required
    if (this.options.urlRequireProtocol) {
      if (!url.match(/^https?:\/\//)) {
        if (this.options.strictMode) {
          errors.push(`'${field.name}' must include protocol (http:// or https://)`);
          return null;
        } else {
          // Auto-add https if missing
          url = `https://${url}`;
        }
      }
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      errors.push(`'${field.name}' is not a valid URL`);
      return null;
    }

    return url;
  }

  /**
   * Validate and normalize boolean field
   */
  private validateBoolean(value: any, field: SchemaField, errors: string[]): boolean | null {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const str = value.toLowerCase().trim();
      if (['true', 'yes', '1', 'on'].includes(str)) {
        return true;
      }
      if (['false', 'no', '0', 'off'].includes(str)) {
        return false;
      }
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    errors.push(`'${field.name}' must be a boolean value (true/false, yes/no, 1/0)`);
    return null;
  }

  /**
   * Validate and normalize number field
   */
  private validateNumber(value: any, field: SchemaField, errors: string[]): number | null {
    let num: number;

    if (typeof value === 'number') {
      num = value;
    } else if (typeof value === 'string') {
      num = parseFloat(value.trim());
    } else {
      errors.push(`'${field.name}' must be a number`);
      return null;
    }

    if (isNaN(num)) {
      errors.push(`'${field.name}' is not a valid number`);
      return null;
    }

    // Range validation
    if (field.validation?.min !== undefined && num < field.validation.min) {
      errors.push(`'${field.name}' must be at least ${field.validation.min}`);
    }

    if (field.validation?.max !== undefined && num > field.validation.max) {
      errors.push(`'${field.name}' must not exceed ${field.validation.max}`);
    }

    return num;
  }

  /**
   * Validate reference field
   */
  private validateReference(value: any, field: SchemaField, errors: string[]): string | null {
    if (typeof value !== 'string') {
      value = String(value);
    }

    const ref = value.trim();

    if (!ref) {
      errors.push(`'${field.name}' reference cannot be empty`);
      return null;
    }

    // Basic format validation for node IDs
    if (this.options.strictMode && !ref.match(/^[a-zA-Z0-9_-]+$/)) {
      errors.push(`'${field.name}' reference must contain only alphanumeric characters, hyphens, and underscores`);
      return null;
    }

    return ref;
  }

  /**
   * Apply custom validation rules
   */
  private applyCustomValidation(value: any, field: SchemaField, errors: string[]): void {
    if (!field.validation) return;

    // Pattern validation
    if (field.validation.pattern && typeof value === 'string') {
      try {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          errors.push(`'${field.name}' does not match the required pattern`);
        }
      } catch {
        errors.push(`Invalid pattern in field '${field.name}' validation`);
      }
    }

    // Options validation (enum-like)
    if (field.validation.options && field.validation.options.length > 0) {
      if (!field.validation.options.includes(String(value))) {
        errors.push(`'${field.name}' must be one of: ${field.validation.options.join(', ')}`);
      }
    }
  }

  /**
   * Create validator from schema config
   */
  static fromConfig(config: SchemaConfig): InputValidator {
    return new InputValidator({
      strictMode: config.validation.strictMode,
      dateFormat: config.validation.dateFormat,
      urlRequireProtocol: config.validation.urlRequireProtocol
    });
  }
}