import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { discriminatedUnion } from 'zod';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(() => {
    appService = new AppService();
    appController = new AppController(appService);
  });

  describe('health', () => {
    it('should return status ok', () => {
      const result = appController.health();
      expect(result.status).toBe('ok');
    });
  });
});