import { NextRequest, NextResponse } from 'next/server';
import { s3Client, dynamoDocClient } from '@/lib/aws/awsClients';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const dynamic = 'force-dynamic';

const S3_BUCKET = process.env.S3_RUNBOOKS_BUCKET || 'sentinel-runbooks-090686622776';
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'sentinel-records-dev';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Fetch document metadata from DynamoDB
    let docRecord: any = null;

    try {
      const getRes = await dynamoDocClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `KNOWLEDGE#${id}`,
            SK: 'KNOWLEDGE_METADATA',
          },
        })
      );
      docRecord = getRes.Item;

      // Fallback check for legacy SK = 'METADATA'
      if (!docRecord) {
        const legacyGet = await dynamoDocClient.send(
          new GetCommand({
            TableName: TABLE_NAME,
            Key: {
              PK: `KNOWLEDGE#${id}`,
              SK: 'METADATA',
            },
          })
        );
        docRecord = legacyGet.Item;
      }
    } catch (dbErr) {
      console.warn(`DynamoDB fetch error for knowledge document ${id}:`, dbErr);
    }

    // 2. Resolve S3 key from source or id
    let s3Key = '';
    if (docRecord?.source && docRecord.source.startsWith(`s3://${S3_BUCKET}/`)) {
      s3Key = docRecord.source.replace(`s3://${S3_BUCKET}/`, '');
    } else if (docRecord?.s3Key) {
      s3Key = docRecord.s3Key;
    } else if (docRecord?.filename) {
      const prefix = docRecord.s3Prefix || 'sops/';
      s3Key = `${prefix}${docRecord.filename}`;
    }

    // 3. Fetch content from S3 or use inline DynamoDB content
    let content = docRecord?.content || '';
    let presignedUrl = '';

    if (s3Key) {
      try {
        const getObjCmd = new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
        });

        // Generate download URL
        presignedUrl = await getSignedUrl(s3Client, getObjCmd, { expiresIn: 3600 });

        // If content wasn't cached in DynamoDB, fetch from S3
        if (!content) {
          const s3Obj = await s3Client.send(getObjCmd);
          if (s3Obj.Body) {
            content = await s3Obj.Body.transformToString();
          }
        }
      } catch (s3Err) {
        console.warn(`S3 fetch notice for key ${s3Key}:`, s3Err);
      }
    }

    if (!docRecord && !content) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: `Knowledge document ${id} not found` } },
        { status: 404 }
      );
    }

    const documentData = {
      id: docRecord?.id || id,
      title: docRecord?.title || id,
      type: docRecord?.type || 'SOP',
      source: docRecord?.source || `s3://${S3_BUCKET}/${s3Key}`,
      version: docRecord?.version || 'v1.0',
      syncStatus: docRecord?.syncStatus || 'INDEXED_HEALTHY',
      lastUpdated: docRecord?.lastUpdated || new Date().toISOString(),
      summary: docRecord?.summary || '',
      content: content || docRecord?.summary || 'No document content available.',
      presignedUrl,
      s3Key,
    };

    return NextResponse.json({
      success: true,
      data: documentData,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve document';
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_FAILED', message } },
      { status: 500 }
    );
  }
}
