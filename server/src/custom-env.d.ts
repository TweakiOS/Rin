import type { QueueTask } from "./queue";

declare global {
  interface Env {
    TASK_QUEUE?: Queue<QueueTask>;
    R2_BUCKET?: R2Bucket;
    /** 站点公开访问地址（可选）。未设置时 sitemap/robots 回退到请求来源 origin */
    FRONTEND_URL?: string;
    /** 邮件投稿：允许的发件人白名单（逗号分隔）。未设置表示不限制发件人 */
    EMAIL_ALLOWED_SENDERS?: string;
    /** 邮件投稿：稿件发布归属的作者 uid */
    EMAIL_PUBLISH_UID?: string;
  }
}

export {};
