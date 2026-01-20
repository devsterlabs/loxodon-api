import { ErrorResponseSchema, HealthResponseSchema } from './common.schema.js';
import {
  CustomerSchema,
  CreateCustomerInputSchema,
  UpdateCustomerInputSchema,
  CustomerResponseSchema,
  CustomerListResponseSchema,
} from './customer.schema.js';
import {
  UserSchema,
  UpdateUserInputSchema,
  UserResponseSchema,
  UserListResponseSchema,
} from './user.schema.js';
import {
  RoleSchema,
  CreateRoleInputSchema,
  UpdateRoleInputSchema,
  RoleResponseSchema,
  RoleListResponseSchema,
} from './role.schema.js';

export const schemas = [
  ErrorResponseSchema,
  HealthResponseSchema,
  CustomerSchema,
  CreateCustomerInputSchema,
  UpdateCustomerInputSchema,
  CustomerResponseSchema,
  CustomerListResponseSchema,
  UserSchema,
  UpdateUserInputSchema,
  UserResponseSchema,
  UserListResponseSchema,
  RoleSchema,
  CreateRoleInputSchema,
  UpdateRoleInputSchema,
  RoleResponseSchema,
  RoleListResponseSchema,
];
