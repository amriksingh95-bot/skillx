import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from '../components/StatCard';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowUpRight: (props) => <svg data-testid="arrow-up" {...props} />,
  ArrowDownRight: (props) => <svg data-testid="arrow-down" {...props} />,
  Minus: (props) => <svg data-testid="minus" {...props} />
}));

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Total Users" value="1,234" />);
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading is true', () => {
    const { container } = render(<StatCard label="Test" value="0" loading={true} />);
    expect(container.querySelector('.skeleton')).toBeInTheDocument();
  });

  it('renders trend badge with up arrow', () => {
    render(<StatCard label="Sales" value="500" trend={{ type: 'up', value: '+12%' }} />);
    expect(screen.getByText('+12%')).toBeInTheDocument();
    expect(screen.getByTestId('arrow-up')).toBeInTheDocument();
  });

  it('renders trend badge with down arrow', () => {
    render(<StatCard label="Sales" value="300" trend={{ type: 'down', value: '-5%' }} />);
    expect(screen.getByText('-5%')).toBeInTheDocument();
    expect(screen.getByTestId('arrow-down')).toBeInTheDocument();
  });

  it('hides trend when not provided', () => {
    render(<StatCard label="Revenue" value="₹10,000" />);
    expect(screen.queryByTestId('arrow-up')).not.toBeInTheDocument();
    expect(screen.queryByTestId('arrow-down')).not.toBeInTheDocument();
  });
});
