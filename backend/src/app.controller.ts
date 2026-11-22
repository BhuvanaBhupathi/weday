import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  root(@Res() res: Response) {
    return res.json({
      name: 'WEday API',
      status: 'online',
      message: 'Backend API is running. The web application is at http://localhost:3000',
      links: {
        frontend: 'http://localhost:3000',
        workspace: 'http://localhost:3000/workspace',
        apiDocs: 'http://localhost:4000/api/docs',
        health: 'http://localhost:4000/health',
      },
    });
  }

  @Public()
  @Get('health')
  health() {
    return this.appService.health();
  }
}
