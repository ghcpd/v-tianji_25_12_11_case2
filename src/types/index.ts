export interface User {
  id: string
  username: string
  email: string
  avatar?: string
  role: 'admin' | 'reviewer' | 'contributor'
  preferences?: UserPreferences
  lastActiveAt?: Date
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  notifications: NotificationSettings
  codeView: CodeViewSettings
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  mentions: boolean
  statusChanges: boolean
  frequency: 'realtime' | 'digest' | 'none'
}

export interface CodeViewSettings {
  fontSize: number
  tabSize: number
  wordWrap: boolean
  minimap: boolean
  lineNumbers: boolean
}

export interface Comment {
  id: string
  authorId: string
  content: string
  lineNumber?: number
  filePath?: string
  createdAt: Date
  updatedAt: Date
  replies: Comment[]
  resolved: boolean
  reactions: Reaction[]
  mentions: string[]
  attachments?: Attachment[]
  metadata?: CommentMetadata
}

export interface Reaction {
  id: string
  userId: string
  type: 'thumbs-up' | 'thumbs-down' | 'heart' | 'laugh' | 'confused' | 'eyes'
  createdAt: Date
}

export interface Attachment {
  id: string
  type: 'image' | 'file' | 'snippet'
  url: string
  name: string
  size: number
  mimeType: string
}

export interface CommentMetadata {
  edited: boolean
  editHistory?: EditRecord[]
  pinned: boolean
  reactionsCount: Record<string, number>
}

export interface EditRecord {
  timestamp: Date
  content: string
  reason?: string
}

export interface Review {
  id: string
  title: string
  description: string
  authorId: string
  status: 'draft' | 'open' | 'in-progress' | 'approved' | 'rejected' | 'merged' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  tags: string[]
  files: ReviewFile[]
  comments: Comment[]
  participants: string[]
  reviewers: string[]
  assignees: string[]
  createdAt: Date
  updatedAt: Date
  dueDate?: Date
  mergedAt?: Date
  closedAt?: Date
  metadata: ReviewMetadata
  permissions: ReviewPermissions
  relatedReviews?: string[]
  labels?: Label[]
}

export interface ReviewMetadata {
  viewCount: number
  lastViewedAt?: Date
  lastViewedBy?: string
  estimatedTime?: number
  actualTime?: number
  complexity?: 'simple' | 'moderate' | 'complex' | 'very-complex'
  riskLevel?: 'low' | 'medium' | 'high'
}

export interface ReviewPermissions {
  canEdit: boolean
  canDelete: boolean
  canApprove: boolean
  canMerge: boolean
  canAssign: boolean
  canClose: boolean
}

export interface Label {
  id: string
  name: string
  color: string
  description?: string
}

export interface ReviewFile {
  id: string
  path: string
  content: string
  language: string
  diff?: string
  originalContent?: string
  addedLines: number
  removedLines: number
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  binary?: boolean
  size?: number
  checksum?: string
}

export interface Notification {
  id: string
  userId: string
  type: 'comment' | 'mention' | 'status-change' | 'assignment' | 'approval' | 'merge'
  message: string
  read: boolean
  createdAt: Date
  relatedReviewId?: string
  relatedCommentId?: string
  actionUrl?: string
  priority: 'low' | 'normal' | 'high'
  metadata?: NotificationMetadata
}

export interface NotificationMetadata {
  actorId?: string
  actorName?: string
  reviewTitle?: string
  commentPreview?: string
}

export interface FilterOptions {
  status?: Review['status'][]
  priority?: Review['priority'][]
  authorId?: string
  assignedTo?: string
  tags?: string[]
  labels?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  searchQuery?: string
  sortBy?: 'created' | 'updated' | 'priority' | 'title'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
  version: number
  etag?: string
}

export interface ApiResponse<T> {
  data: T
  status: number
  headers: Record<string, string>
  cached?: boolean
  fromCache?: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ErrorDetails {
  code: string
  message: string
  field?: string
  stack?: string
  context?: Record<string, unknown>
  timestamp: Date
  userId?: string
  requestId?: string
}

export interface PerformanceMetrics {
  operation: string
  duration: number
  timestamp: Date
  metadata?: Record<string, unknown>
}
