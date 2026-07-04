import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DataTable from '../components/DataTable';

vi.mock('lucide-react', () => ({
  ChevronLeft: (props) => <svg data-testid="chevron-left" {...props} />,
  ChevronRight: (props) => <svg data-testid="chevron-right" {...props} />,
  Database: (props) => <svg data-testid="database-icon" {...props} />
}));

const mockColumns = [
  { header: 'Name', accessor: 'name' },
  { header: 'Email', accessor: 'email' }
];

const mockData = [
  { id: '1', name: 'Alice', email: 'alice@test.com' },
  { id: '2', name: 'Bob', email: 'bob@test.com' }
];

describe('DataTable', () => {
  it('renders data rows (desktop + mobile views)', () => {
    render(<DataTable columns={mockColumns} data={mockData} />);
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('alice@test.com').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
  });

  it('renders dash for null cell values', () => {
    const data = [{ id: '1', name: 'Alice', email: null }];
    render(<DataTable columns={mockColumns} data={data} />);
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('renders EmptyState for empty data', () => {
    render(<DataTable columns={mockColumns} data={[]} />);
    expect(screen.getAllByTestId('database-icon').length).toBeGreaterThanOrEqual(1);
  });
});
