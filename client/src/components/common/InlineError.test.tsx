import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { InlineError } from './InlineError';

describe('InlineError', () => {
  it('renders title and message', () => {
    render(
      <InlineError
        title="Test Error"
        message="Something went wrong"
      />
    );

    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders default title when none provided', () => {
    render(
      <InlineError
        message="Test message"
      />
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls onRetry when button pressed', () => {
    const mockRetry = vi.fn();
    
    render(
      <InlineError
        message="Test error"
        onRetry={mockRetry}
      />
    );

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);
    
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('renders without retry button when onRetry not provided', () => {
    render(
      <InlineError
        message="Test error"
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders with custom action label', () => {
    const mockRetry = vi.fn();
    
    render(
      <InlineError
        message="Test error"
        onRetry={mockRetry}
        actionLabel="Try Again"
      />
    );

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <InlineError
        message="Test error"
        data-testid="error-component"
      />
    );

    const errorElement = screen.getByRole('alert');
    expect(errorElement).toHaveAttribute('data-testid', 'error-component');
  });
});