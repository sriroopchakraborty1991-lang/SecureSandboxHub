import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3001),
  JWT_SECRET: Joi.string().min(16).required(),
  DATABASE_PATH: Joi.string().default('./data/app.db'),
  DOCKER_SOCKET: Joi.string().default('/var/run/docker.sock')
}).unknown(true);

const {value, error} = schema.validate(process.env);

if (error) {
  throw new Error(`Invalid environment: ${error.message}`);
}

export const env = {
  nodeEnv: value.NODE_ENV as 'development' | 'test' | 'production',
  port: value.PORT as number,
  jwtSecret: value.JWT_SECRET as string,
  databasePath: value.DATABASE_PATH as string,
  dockerSocket: value.DOCKER_SOCKET as string
};

