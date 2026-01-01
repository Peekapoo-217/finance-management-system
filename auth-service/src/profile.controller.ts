// src/profile.controller.ts  (tạo file mới)

import { Controller, Post, Body, UseGuards, Request, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';


@ApiTags('profile')
@ApiBearerAuth()
@Controller()  // <<< Không có prefix gì cả
export class ProfileController {
  constructor(private authService: AuthService) { }

  @UseGuards(JwtAuthGuard)
  @Post('auth/change-password')  // Gateway forward đúng /auth/change-password → match ở đây
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Request() req,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(
      req.user.userId,
      body.currentPassword,
      body.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('auth/profile')  // Cũng match đúng /auth/profile từ gateway
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @Request() req,
    @Body() body: { name?: string },
  ) {
    return this.authService.updateProfile(req.user.userId, body);
  }
}