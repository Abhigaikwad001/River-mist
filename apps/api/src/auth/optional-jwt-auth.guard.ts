import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest so it never throws an error if token is missing/invalid
  handleRequest(err: any, user: any, info: any) {
    return user;
  }
}
