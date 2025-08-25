import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GlobalHeader } from './GlobalHeader';

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/test', vi.fn()]
}));

describe('GlobalHeader', () => {
  it('renders title when provided', () => {
    render(<GlobalHeader title="Test Page" />);
    expect(screen.getByText('Test Page')).toBeInTheDocument();
  });

  it('renders back button when backButton is true', () => {
    render(<GlobalHeader backButton={true} />);
    const backButton = screen.getByRole('button', { name: 'Go back' });
    expect(backButton).toBeInTheDocument();
  });

  it('back button is focusable and triggers navigation', () => {
    const mockHistoryBack = vi.spyOn(window.history, 'back');
    Object.defineProperty(window.history, 'length', { value: 2 });
    
    render(<GlobalHeader backButton={true} />);
    const backButton = screen.getByRole('button', { name: 'Go back' });
    
    expect(backButton).toBeInTheDocument();
    fireEvent.click(backButton);
    
    expect(mockHistoryBack).toHaveBeenCalledTimes(1);
  });

  it('renders right slot when provided', () => {
    render(
      <GlobalHeader 
        title="Test"
        rightSlot={<button>Custom Action</button>}
      />
    );
    
    expect(screen.getByText('Custom Action')).toBeInTheDocument();
  });

  it('has proper banner role for accessibility', () => {
    render(<GlobalHeader title="Test" />);
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });
});