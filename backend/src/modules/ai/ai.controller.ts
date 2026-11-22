import {
  BadRequestException,
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze-prd')
  async analyzePrd(@Body('content') content: string) {
    return this.aiService.analyzePrd(content);
  }

  @Post('generate-architecture')
  async generateArchitecture(@Body('content') content: string) {
    return this.aiService.generateArchitectureFromPrd(content);
  }

  @Post('explain-code')
  async explainCode(
    @Body('code') code: string,
    @Body('language') language?: string,
  ) {
    return this.aiService.explainCode(code, language);
  }

  @Post('bands/:bandId/generate-from-sketch')
  async generateFromSketch(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body('sketch') sketch: string,
  ) {
    return this.aiService.generateProjectFromSketch(bandId, user.id, sketch);
  }

  @Post('bands/:bandId/generate-architecture-from-prd')
  async generateArchitectureForBand(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body('content') content?: string,
  ) {
    return this.aiService.generateArchitectureForBand(bandId, user.id, content);
  }

  /**
   * Canvas "Ask Gemini" — band-aware software development Q&A.
   * Body: { question, context?: { bandName, prdContent, architectureSummary, pageName, selectedNode } }
   */
  @Post('bands/:bandId/ask')
  async askSoftwareQuestion(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body('question') question: string,
    @Body('context') context?: any,
  ) {
    if (!question || !question.trim()) {
      throw new BadRequestException('Question is required');
    }
    return this.aiService.askSoftwareQuestion(bandId, user.id, question.trim(), context);
  }

  /**
   * Canvas "Generate PRD" — structured, point-based PRD from a product description.
   * Body: { description }
   */
  @Post('bands/:bandId/generate-prd')
  async generateStructuredPrd(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body('description') description: string,
  ) {
    if (!description || !description.trim()) {
      throw new BadRequestException('Product description is required');
    }
    return this.aiService.generateStructuredPrd(bandId, user.id, description.trim());
  }
}

