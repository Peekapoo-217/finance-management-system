import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) { }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
    });

    await this.userRepository.save(user);

    const { password, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    const isPasswordHashed = user.password.startsWith('$2a$') || 
                            user.password.startsWith('$2b$') || 
                            user.password.startsWith('$2y$');

    let isPasswordValid: boolean;

    if (isPasswordHashed) {
      // Password is already hashed, use bcrypt.compare
      isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    } else {
      // Legacy plain text password - compare directly and then hash it
      isPasswordValid = loginDto.password === user.password;
      
      if (isPasswordValid) {
        // Hash the password and update it in the database
        const hashedPassword = await bcrypt.hash(loginDto.password, 10);
        user.password = hashedPassword;
        await this.userRepository.save(user);
      }
    }

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async validateUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const { password, ...result } = user;
    return result;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await this.userRepository.findOne({ where: { id: userId } });

  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new BadRequestException('Mật khẩu hiện tại không đúng');
  }

  if (currentPassword === newPassword) {
    throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedNewPassword;
  await this.userRepository.save(user);

  return { message: 'Đổi mật khẩu thành công' };
}

async updateProfile(userId: string, updateData: { name?: string }) {
  const user = await this.userRepository.findOne({ where: { id: userId } });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  if (updateData.name !== undefined) {
    user.name = updateData.name || undefined;
  }

  await this.userRepository.save(user);

  const { password, ...result } = user;
  return result;
}
}

