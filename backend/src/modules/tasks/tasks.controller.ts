import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { TaskStatus } from '@prisma/client';
import { TasksService } from './tasks.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';

@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('bands/:bandId/tasks')
  async getBandTasks(
    @Param('bandId') bandId: string,
    @Query('status') status?: TaskStatus,
    @Query('milestoneId') milestoneId?: string,
  ) {
    return this.tasksService.getBandTasks(bandId, status, milestoneId);
  }

  @Post('bands/:bandId/tasks')
  async createTask(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.createTask(bandId, user.id, dto);
  }

  @Get('tasks/my')
  async getMyTasks(@CurrentUser() user: User) {
    return this.tasksService.getMyTasks(user.id);
  }

  @Patch('tasks/:taskId')
  async updateTask(
    @Param('taskId') taskId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.updateTask(taskId, user.id, dto);
  }

  @Delete('tasks/:taskId')
  async deleteTask(
    @Param('taskId') taskId: string,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.deleteTask(taskId, user.id);
  }

  // ─── Milestones ───────────────────────────────────────────────────────────

  @Get('bands/:bandId/milestones')
  async getBandMilestones(@Param('bandId') bandId: string) {
    return this.tasksService.getBandMilestones(bandId);
  }

  @Post('bands/:bandId/milestones')
  async createMilestone(
    @Param('bandId') bandId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.tasksService.createMilestone(bandId, dto);
  }

  @Patch('milestones/:milestoneId')
  async updateMilestone(
    @Param('milestoneId') milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.tasksService.updateMilestone(milestoneId, dto);
  }

  @Delete('milestones/:milestoneId')
  async deleteMilestone(@Param('milestoneId') milestoneId: string) {
    return this.tasksService.deleteMilestone(milestoneId);
  }

  // ─── Execution Alignment Metrics ───────────────────────────────────────────

  @Get('bands/:bandId/tasks/alignment')
  async getAlignmentMetrics(@Param('bandId') bandId: string) {
    return this.tasksService.getAlignmentMetrics(bandId);
  }
}

