import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from '../client/src/components/Button';

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: 'Click me' });
    
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn', 'btn--primary', 'btn--md');
  });

  it('renders with primary variant', () => {
    render(<Button variant="primary">Primary Button</Button>);
    const button = screen.getByRole('button', { name: 'Primary Button' });
    
    expect(button).toHaveClass('btn--primary');
  });

  it('renders with secondary variant', () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    const button = screen.getByRole('button', { name: 'Secondary Button' });
    
    expect(button).toHaveClass('btn--secondary');
  });

  it('renders with outline variant', () => {
    render(<Button variant="outline">Outline Button</Button>);
    const button = screen.getByRole('button', { name: 'Outline Button' });
    
    expect(button).toHaveClass('btn--outline');
  });

  it('renders with circle shape', () => {
    render(<Button shape="circle" aria-label="Add">+</Button>);
    const button = screen.getByRole('button', { name: 'Add' });
    
    expect(button).toHaveClass('btn--circle');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn--sm');

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn--md');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn--lg');
  });

  it('handles disabled state', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button', { name: 'Disabled Button' });
    
    expect(button).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button', { name: 'Custom' });
    
    expect(button).toHaveClass('custom-class');
  });

  it('combines multiple props correctly', () => {
    render(
      <Button variant="secondary" shape="circle" size="lg" className="custom">
        Combined
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Combined' });
    
    expect(button).toHaveClass(
      'btn',
      'btn--secondary',
      'btn--circle',
      'btn--lg',
      'custom'
    );
  });

  it('passes through HTML button attributes', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick} type="submit">Submit</Button>);
    const button = screen.getByRole('button', { name: 'Submit' });
    
    expect(button).toHaveAttribute('type', 'submit');
    
    button.click();
    expect(onClick).toHaveBeenCalled();
  });
});