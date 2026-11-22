import { useState, type FormEvent } from 'react';
import type { LeaveType, NewLeaveRequest } from '../types';

interface Props {
  onSubmit: (input: NewLeaveRequest) => Promise<void> | void;
}

const empty: NewLeaveRequest = { type: 'annual', startDate: '', endDate: '', reason: '' };

export function validate(input: NewLeaveRequest): string | null {
  if (!input.startDate || !input.endDate) return 'Start and end dates are required';
  if (input.endDate < input.startDate) return 'End date cannot be before start date';
  if (input.reason.trim().length < 3) return 'Reason must be at least 3 characters';
  return null;
}

export function LeaveRequestForm({ onSubmit }: Props) {
  const [form, setForm] = useState<NewLeaveRequest>(empty);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validate(form);
    setError(problem);
    if (problem) return;
    setBusy(true);
    try {
      await onSubmit({ ...form, reason: form.reason.trim() });
      setForm(empty);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate data-cy="leave-form" aria-label="New leave request">
      <label htmlFor="leave-type">Leave type</label>
      <select
        id="leave-type"
        data-cy="leave-type"
        value={form.type}
        onChange={(e) => setForm({ ...form, type: e.target.value as LeaveType })}
      >
        <option value="annual">Annual</option>
        <option value="sick">Sick</option>
        <option value="unpaid">Unpaid</option>
      </select>

      <label htmlFor="leave-start">Start date</label>
      <input
        id="leave-start"
        type="date"
        data-cy="leave-start"
        value={form.startDate}
        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
      />

      <label htmlFor="leave-end">End date</label>
      <input
        id="leave-end"
        type="date"
        data-cy="leave-end"
        value={form.endDate}
        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
      />

      <label htmlFor="leave-reason">Reason</label>
      <textarea
        id="leave-reason"
        data-cy="leave-reason"
        rows={2}
        value={form.reason}
        onChange={(e) => setForm({ ...form, reason: e.target.value })}
      />

      {error && (
        <p role="alert" className="error" data-cy="leave-form-error">
          {error}
        </p>
      )}
      <button type="submit" data-cy="leave-submit" disabled={busy}>
        {busy ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  );
}
