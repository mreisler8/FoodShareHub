# Restaurant Page Development Standards

## Definition of Done Contracts

### Frontend Component Development

#### Component Creation Checklist
- [ ] **TypeScript Interface**: Define complete props interface with JSDoc
- [ ] **Loading States**: Implement skeleton loading with appropriate duration
- [ ] **Error States**: Include error boundary with retry mechanism
- [ ] **Empty States**: Provide helpful messaging and call-to-action
- [ ] **Responsive Design**: Mobile-first with tablet and desktop breakpoints
- [ ] **Accessibility**: ARIA labels, keyboard navigation, focus management
- [ ] **Testing**: Unit tests with >80% coverage
- [ ] **Storybook**: Component documentation with all variants

#### Example: Complete Component Template
```typescript
interface ComponentProps {
  /** Required description with examples */
  data: ComponentData;
  /** Optional description with default */
  variant?: 'compact' | 'detailed';
  /** Callback description */
  onAction?: (id: number) => void;
}

export function Component({ 
  data, 
  variant = 'detailed', 
  onAction 
}: ComponentProps) {
  // Loading state
  if (!data) {
    return <ComponentSkeleton variant={variant} />;
  }

  // Error state
  if (data.error) {
    return <InlineError message={data.error} onRetry={onAction} />;
  }

  // Empty state
  if (data.items.length === 0) {
    return <EmptyState message="No items found" />;
  }

  // Main content
  return (
    <div 
      className={cn("component-base", variant === 'compact' && "compact")}
      role="region"
      aria-label="Component content"
    >
      {/* Implementation */}
    </div>
  );
}
```

### Backend API Development

#### API Endpoint Checklist
- [ ] **Authentication**: Proper session validation on protected routes
- [ ] **Input Validation**: Zod schema validation on all inputs
- [ ] **Error Handling**: Structured error responses with codes
- [ ] **Rate Limiting**: Appropriate limits for endpoint usage
- [ ] **Caching**: Redis cache with optimal TTL
- [ ] **Logging**: Request/response logging with context
- [ ] **Testing**: Integration tests with edge cases
- [ ] **Documentation**: OpenAPI spec with examples

#### Example: Complete API Endpoint
```typescript
// Input validation schema
const requestSchema = z.object({
  restaurantId: z.number().int().positive(),
  rating: z.number().min(0.1).max(10.0),
  note: z.string().max(140).optional(),
});

router.put('/ratings', authenticate, async (req, res) => {
  try {
    // 1. Validate input
    const data = requestSchema.parse(req.body);
    
    // 2. Check rate limits
    const rateLimitKey = `rate_limit:${req.user.id}`;
    const count = await redis.incr(rateLimitKey);
    if (count > 5) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED' 
      });
    }
    
    // 3. Business logic
    const result = await createRating(req.user.id, data);
    
    // 4. Cache invalidation
    await redis.del(`circleScore:${data.restaurantId}`);
    
    // 5. Success response
    res.status(201).json(result);
    
  } catch (error) {
    // 6. Error handling
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors
      });
    }
    
    console.error('Rating creation failed:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});
```

## Query Management Standards

### React Query Implementation Rules

#### Required Query Configuration
```typescript
const QUERY_STANDARDS = {
  // Always use structured query keys
  queryKey: ['entityType', entityId, ...filters],
  
  // Implement proper error handling
  retry: (failureCount, error) => {
    if (error.status >= 400 && error.status < 500) {
      return false; // Don't retry client errors
    }
    return failureCount < 3;
  },
  
  // Set appropriate stale times
  staleTime: 30000, // 30s for dynamic data
  cacheTime: 300000, // 5min for cache retention
  
  // Handle loading states
  enabled: !!requiredParam,
  
  // Background refresh
  refetchOnWindowFocus: false,
  refetchOnMount: 'always',
};
```

#### Cache Invalidation Pattern
```typescript
// REQUIRED: Invalidate all related caches on mutation
const mutation = useMutation({
  mutationFn: apiCall,
  onSuccess: (data, variables) => {
    // Invalidate specific cache
    queryClient.invalidateQueries({ 
      queryKey: ['userRating', variables.restaurantId] 
    });
    
    // Invalidate dependent caches
    queryClient.invalidateQueries({ 
      queryKey: ['circleScore', variables.restaurantId] 
    });
    
    // Invalidate broader caches if needed
    queryClient.invalidateQueries({ 
      queryKey: ['restaurant', variables.googlePlaceId] 
    });
  },
});
```

### Database Query Standards

#### Drizzle ORM Best Practices
```typescript
// REQUIRED: Use proper joins and indexes
const getUserRatings = async (userId: number, restaurantId: number) => {
  return await db.query.ratings.findFirst({
    where: and(
      eq(ratings.userId, userId),
      eq(ratings.restaurantId, restaurantId),
      // Always filter test data
      or(isNull(ratings.isTest), eq(ratings.isTest, false))
    ),
    columns: {
      id: true,
      ratingValue: true,
      note: true,
      tags: true,
      createdAt: true,
    },
  });
};

// REQUIRED: Use transactions for multi-table operations
const createRatingWithUpdate = async (data: RatingData) => {
  return await db.transaction(async (tx) => {
    const rating = await tx.insert(ratings).values(data).returning();
    await tx.update(restaurants)
      .set({ 
        rating: sql`(SELECT AVG(rating_value) FROM ratings WHERE restaurant_id = ${data.restaurantId})`,
        updatedAt: new Date()
      })
      .where(eq(restaurants.id, data.restaurantId));
    
    return rating[0];
  });
};
```

## Error Handling Standards

### Frontend Error Boundaries

#### Component-Level Error Handling
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ComponentErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component error:', error, errorInfo);
    // Report to monitoring service
    reportError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <InlineError 
          message="Something went wrong with this component"
          onRetry={() => this.setState({ hasError: false })}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      );
    }

    return this.props.children;
  }
}
```

#### Query Error Handling
```typescript
const useRobustQuery = <T>(
  queryKey: QueryKey,
  queryFn: QueryFunction<T>,
  options?: UseQueryOptions<T>
) => {
  return useQuery({
    queryKey,
    queryFn,
    ...options,
    onError: (error: any) => {
      // Log error with context
      console.error('Query failed:', { queryKey, error });
      
      // Report to monitoring
      reportError(error, { queryKey, userId: getCurrentUserId() });
      
      // Toast for user feedback (non-intrusive)
      if (error.status >= 500) {
        toast({
          title: "Something went wrong",
          description: "Please try again in a moment",
          variant: "destructive",
        });
      }
    },
    retry: (failureCount, error) => {
      // Custom retry logic
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
};
```

### Backend Error Standards

#### Structured Error Response
```typescript
interface ErrorResponse {
  error: string;           // Human-readable message
  code: string;           // Machine-readable code
  details?: any;          // Additional context
  timestamp: string;      // ISO timestamp
  requestId?: string;     // Trace ID
}

const createErrorResponse = (
  error: string,
  code: string,
  details?: any
): ErrorResponse => ({
  error,
  code,
  details,
  timestamp: new Date().toISOString(),
  requestId: generateRequestId(),
});
```

#### Error Logging Standard
```typescript
const logError = (error: Error, context: any) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error.message,
    stack: error.stack,
    context,
    userId: context.userId,
    requestId: context.requestId,
  };
  
  console.error(JSON.stringify(logEntry));
  
  // Send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    sendToMonitoring(logEntry);
  }
};
```

## Security Standards

### Authentication Requirements

#### Session Validation Middleware
```typescript
const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check session exists
    if (!req.session?.userId) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }
    
    // Validate user exists and is active
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.id, req.session.userId),
        eq(users.status, 'active')
      ),
      columns: { id: true, email: true, role: true }
    });
    
    if (!user) {
      req.session.destroy();
      return res.status(401).json({
        error: 'Invalid session',
        code: 'INVALID_SESSION'
      });
    }
    
    // Attach user to request
    (req as any).user = user;
    next();
    
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};
```

#### Input Validation Standards
```typescript
// REQUIRED: Validate all inputs with Zod
const validateInput = <T>(schema: z.ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors
        });
      }
      next(error);
    }
  };
};

// Usage
router.post('/api/ratings', 
  authenticate,
  validateInput(createRatingSchema),
  createRatingHandler
);
```

## Performance Standards

### Frontend Performance Requirements
- **First Contentful Paint**: <1.2s
- **Largest Contentful Paint**: <2.5s
- **Cumulative Layout Shift**: <0.1
- **First Input Delay**: <100ms
- **Time to Interactive**: <3.0s

### Backend Performance Requirements
- **API Response Time**: P95 <500ms
- **Database Query Time**: P95 <200ms
- **Cache Hit Rate**: >70%
- **Memory Usage**: <500MB per instance
- **CPU Usage**: <80% sustained

### Performance Monitoring
```typescript
// Request timing middleware
const timingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = performance.now();
  
  res.on('finish', () => {
    const duration = performance.now() - start;
    
    console.log(`${req.method} ${req.path} - ${duration.toFixed(2)}ms`);
    
    // Alert on slow requests
    if (duration > 1000) {
      console.warn(`Slow request detected: ${req.path} took ${duration}ms`);
    }
  });
  
  next();
};
```

## Testing Standards

### Frontend Testing Requirements
```typescript
// Component testing template
describe('RestaurantRatingCard', () => {
  it('should render loading state correctly', () => {
    render(<RestaurantRatingCard isLoading={true} />);
    expect(screen.getByTestId('rating-skeleton')).toBeInTheDocument();
  });
  
  it('should handle error state gracefully', () => {
    const mockError = new Error('Failed to load');
    render(<RestaurantRatingCard error={mockError} />);
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });
  
  it('should submit rating with correct data', async () => {
    const mockSubmit = jest.fn();
    render(<RestaurantRatingCard onSubmit={mockSubmit} />);
    
    await userEvent.type(screen.getByLabelText(/rating/i), '8.5');
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    expect(mockSubmit).toHaveBeenCalledWith({
      rating: 8.5,
      // ... other expected data
    });
  });
});
```

### Backend Testing Requirements
```typescript
// API endpoint testing template
describe('POST /api/ratings', () => {
  beforeEach(async () => {
    await setupTestData();
  });
  
  afterEach(async () => {
    await cleanupTestData();
  });
  
  it('should create rating with valid data', async () => {
    const response = await request(app)
      .post('/api/ratings')
      .set('Cookie', validSessionCookie)
      .send({
        restaurantId: 1,
        rating: 8.5,
        note: 'Great food!'
      })
      .expect(201);
    
    expect(response.body).toMatchObject({
      id: expect.any(Number),
      rating: 8.5,
      note: 'Great food!'
    });
  });
  
  it('should reject invalid rating value', async () => {
    await request(app)
      .post('/api/ratings')
      .set('Cookie', validSessionCookie)
      .send({
        restaurantId: 1,
        rating: 15.0 // Invalid - exceeds 10.0
      })
      .expect(400)
      .expect(res => {
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });
  });
});
```

## Documentation Standards

### Code Documentation Requirements
```typescript
/**
 * Calculates Circle Score for a restaurant based on user's network
 * 
 * @param restaurantId - Internal restaurant identifier
 * @param userId - Current user's ID for network calculation
 * @returns Promise resolving to circle score data
 * 
 * @example
 * ```typescript
 * const score = await calculateCircleScore(123, 456);
 * console.log(`Score: ${score.score}/10`);
 * ```
 * 
 * @throws {Error} When restaurant not found
 * @throws {Error} When user has no network data
 */
async function calculateCircleScore(
  restaurantId: number, 
  userId: number
): Promise<CircleScoreData> {
  // Implementation
}
```

### API Documentation Standards
All endpoints must include:
- Purpose and business logic
- Authentication requirements
- Request/response schemas
- Example requests and responses
- Error codes and scenarios
- Rate limiting information
- Cache behavior

## Deployment Standards

### Pre-Deployment Checklist
- [ ] **All Tests Pass**: Unit, integration, and E2E tests
- [ ] **Performance Benchmarks**: Meet all performance requirements
- [ ] **Security Scan**: No high or medium vulnerabilities
- [ ] **Type Checking**: No TypeScript errors
- [ ] **Linting**: All ESLint rules pass
- [ ] **Bundle Analysis**: No significant size increases
- [ ] **Database Migrations**: Tested and reversible
- [ ] **Environment Variables**: All required vars configured
- [ ] **Monitoring**: Health checks and alerting configured
- [ ] **Rollback Plan**: Tested rollback procedure

### Production Monitoring Requirements
- **Health Checks**: `/health` endpoint with dependency checks
- **Metrics Collection**: Request rates, response times, error rates
- **Log Aggregation**: Structured logging with trace IDs
- **Alerting**: Critical error and performance degradation alerts
- **Performance Tracking**: Core Web Vitals and API response times

This document serves as the authoritative source for development standards across the restaurant page ecosystem. All new development must adhere to these standards to ensure consistency, quality, and maintainability.