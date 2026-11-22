import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, TOKEN_KEY } from './api';
import { LeaveRequestForm } from './components/LeaveRequestForm';
import type { LeaveRequest, NewLeaveRequest, User } from './types';

function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const { token, user } = await api.login(email, password);
      localStorage.setItem(TOKEN_KEY, token);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <main>
      <h1>Acme HR</h1>
      <section>
        <h2>Sign in</h2>
        <form onSubmit={submit} data-cy="login-form" aria-label="Sign in">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="username" data-cy="login-email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" data-cy="login-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && (
            <p role="alert" className="error" data-cy="login-error">
              {error}
            </p>
          )}
          <button type="submit" data-cy="login-submit">Sign in</button>
        </form>
      </section>
    </main>
  );
}

function RequestTable({ rows, caption, decide }: { rows: LeaveRequest[]; caption: string; decide?: (id: number, d: 'approve' | 'reject') => void }) {
  if (rows.length === 0) return <p data-cy="empty-state">Nothing here yet.</p>;
  return (
    <table>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Employee</th>
          <th scope="col">Type</th>
          <th scope="col">Dates</th>
          <th scope="col">Reason</th>
          <th scope="col">Status</th>
          {decide && <th scope="col">Decision</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} data-cy="leave-row" data-id={r.id}>
            <td>{r.employeeName}</td>
            <td>{r.type}</td>
            <td>
              {r.startDate} to {r.endDate}
            </td>
            <td data-cy="leave-row-reason">{r.reason}</td>
            <td className="status" data-cy="leave-row-status">
              {r.status}
            </td>
            {decide && (
              <td>
                <button type="button" data-cy="approve" onClick={() => decide(r.id, 'approve')} aria-label={`Approve ${r.employeeName}: ${r.reason}`}>
                  Approve
                </button>
                <button type="button" className="secondary" data-cy="reject" onClick={() => decide(r.id, 'reject')} aria-label={`Reject ${r.employeeName}: ${r.reason}`}>
                  Reject
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRequests(await api.leaveRequests());
    if (user.role === 'admin') setTeam(await api.users());
  }, [user.role]);

  useEffect(() => {
    refresh().catch((err) => setNotice(String(err)));
  }, [refresh]);

  async function submit(input: NewLeaveRequest) {
    await api.createLeaveRequest(input);
    setNotice('Leave request submitted');
    await refresh();
  }

  async function decide(id: number, decision: 'approve' | 'reject') {
    try {
      await api.decide(id, decision);
      setNotice(decision === 'approve' ? 'Request approved' : 'Request rejected');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    }
    await refresh();
  }

  const mine = requests.filter((r) => r.employeeId === user.id);
  const toDecide = requests.filter((r) => r.employeeId !== user.id && r.status === 'pending');

  return (
    <>
      <header>
        <span data-cy="current-user">
          {user.name} ({user.role})
        </span>
        <button type="button" data-cy="logout" onClick={onLogout}>
          Sign out
        </button>
      </header>
      <main>
        <h1>Leave requests</h1>
        {notice && (
          <p role="status" data-cy="notice">
            {notice}
          </p>
        )}
        <section aria-labelledby="new-heading">
          <h2 id="new-heading">Request leave</h2>
          <LeaveRequestForm onSubmit={submit} />
        </section>
        <section aria-labelledby="mine-heading" data-cy="my-requests">
          <h2 id="mine-heading">My requests</h2>
          <RequestTable rows={mine} caption="My leave requests" />
        </section>
        {user.role !== 'employee' && (
          <section aria-labelledby="approvals-heading" data-cy="approvals">
            <h2 id="approvals-heading">Waiting for my decision</h2>
            <RequestTable rows={toDecide} caption="Requests waiting for a decision" decide={decide} />
          </section>
        )}
        {user.role === 'admin' && (
          <section aria-labelledby="team-heading" data-cy="team">
            <h2 id="team-heading">Everyone</h2>
            <ul>
              {team.map((u) => (
                <li key={u.id} data-cy="team-member">
                  {u.name}, {u.role}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    if (!checking) return;
    api
      .me()
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setChecking(false));
  }, [checking]);

  if (checking) return <p>Loading…</p>;
  if (!user) return <LoginPage onLogin={setUser} />;
  return (
    <Dashboard
      user={user}
      onLogout={() => {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      }}
    />
  );
}
