import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';
import { R2Config } from 'src/config/r2.config';

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client;
  private readonly config: R2Config;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<R2Config>(ConfigKey.R2)!;

    this.client = new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });

    this.logger.log(`R2 client initialized for bucket: ${this.config.bucketName}`);
  }

  async uploadBattleData(battleId: string, data: any): Promise<void> {
    try {
      const key = `battles/${battleId}.json`;

      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: JSON.stringify(data, null, 2),
        ContentType: 'application/json',
        Metadata: {
          'battle-id': battleId,
          'uploaded-at': new Date().toISOString(),
        },
      });

      await this.client.send(command);
      this.logger.log(`Battle data uploaded successfully for battle ${battleId}`);
    } catch (error) {
      this.logger.error(`Failed to upload battle data for ${battleId}:`, error);
      throw error;
    }
  }

  async getBattleData(battleId: string): Promise<any> {
    try {
      const key = `battles/${battleId}.json`;

      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error(`No data found for battle ${battleId}`);
      }

      const data = await response.Body.transformToString();
      this.logger.log(`Battle data retrieved successfully for battle ${battleId}`);

      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Failed to retrieve battle data for ${battleId}:`, error);
      throw error;
    }
  }

  async deleteBattleData(battleId: string): Promise<void> {
    try {
      const key = `battles/${battleId}.json`;

      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      await this.client.send(command);
      this.logger.log(`Battle data deleted successfully for battle ${battleId}`);
    } catch (error) {
      this.logger.error(`Failed to delete battle data for ${battleId}:`, error);
      throw error;
    }
  }
}