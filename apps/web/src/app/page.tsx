'use client';

import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface Field {
  name: string;
  type: string;
  required: boolean;
  placeholder?: string;
}

interface Endpoint {
  id: string;
  method: Method;
  path: string;
  pathParams?: string[];
  fields: Field[];
}

interface ResponseState {
  status: number | null;
  body: unknown;
  time: number;
}

const ENDPOINTS: Endpoint[] = [
  {
    id: 'signup',
    method: 'POST',
    path: '/api/auth/signup',
    fields: [
      { name: 'email', type: 'email', required: true, placeholder: 'user@example.com' },
      { name: 'password', type: 'password', required: true, placeholder: '••••••••' },
      { name: 'phone', type: 'tel', required: true, placeholder: '+91-' },
      { name: 'full_name', type: 'text', required: true, placeholder: 'Jane Doe' },
      { name: 'preferred_language', type: 'text', required: true, placeholder: 'en' },
    ],
  },
  {
    id: 'login',
    method: 'POST',
    path: '/api/auth/login',
    fields: [
      { name: 'email', type: 'email', required: true, placeholder: 'user@example.com' },
      { name: 'password', type: 'password', required: true, placeholder: '••••••••' },
    ],
  },
  {
    id: 'logout',
    method: 'POST',
    path: '/api/auth/logout',
    fields: [],
  },
  {
    id: 'list-circles',
    method: 'GET',
    path: '/api/v1/circles',
    fields: [],
  },
  {
    id: 'create-circle',
    method: 'POST',
    path: '/api/v1/circles',
    fields: [
      { name: 'name', type: 'text', required: true, placeholder: 'Family Circle' },
      { name: 'tenant_timezone', type: 'text', required: true, placeholder: 'Asia/Kolkata' },
    ],
  },
  {
    id: 'get-circle',
    method: 'GET',
    path: '/api/v1/circles/{circleId}',
    pathParams: ['circleId'],
    fields: [
      { name: 'circleId', type: 'text', required: true, placeholder: 'circle-uuid' },
    ],
  },
  {
    id: 'update-circle',
    method: 'PATCH',
    path: '/api/v1/circles/{circleId}',
    pathParams: ['circleId'],
    fields: [
      { name: 'circleId', type: 'text', required: true, placeholder: 'circle-uuid' },
      { name: 'name', type: 'text', required: false, placeholder: 'Updated name' },
      { name: 'tenant_timezone', type: 'text', required: false, placeholder: 'UTC' },
    ],
  },
  {
    id: 'delete-circle',
    method: 'DELETE',
    path: '/api/v1/circles/{circleId}',
    pathParams: ['circleId'],
    fields: [
      { name: 'circleId', type: 'text', required: true, placeholder: 'circle-uuid' },
    ],
  },
  {
    id: 'list-members',
    method: 'GET',
    path: '/api/v1/circles/{circleId}/members',
    pathParams: ['circleId'],
    fields: [
      { name: 'circleId', type: 'text', required: true, placeholder: 'circle-uuid' },
    ],
  },
  {
    id: 'add-member',
    method: 'POST',
    path: '/api/v1/circles/{circleId}/members',
    pathParams: ['circleId'],
    fields: [
      { name: 'circleId', type: 'text', required: true, placeholder: 'circle-uuid' },
      { name: 'user_id', type: 'text', required: true, placeholder: 'user-uuid' },
      { name: 'role', type: 'text', required: true, placeholder: 'caregiver' },
    ],
  },
  {
    id: 'change-role',
    method: 'PATCH',
    path: '/api/v1/circles/{circleId}/members/{userId}',
    pathParams: ['circleId', 'userId'],
    fields: [
      { name: 'circleId', type: 'text', required: true, placeholder: 'circle-uuid' },
      { name: 'userId', type: 'text', required: true, placeholder: 'user-uuid' },
      { name: 'role', type: 'text', required: true, placeholder: 'coordinator' },
    ],
  },
  {
    id: 'remove-member',
    method: 'DELETE',
    path: '/api/v1/circles/{circleId}/members/{userId}',
    pathParams: ['circleId', 'userId'],
    fields: [
      { name: 'circleId', type: 'text', required: true, placeholder: 'circle-uuid' },
      { name: 'userId', type: 'text', required: true, placeholder: 'user-uuid' },
    ],
  },
];

const METHOD_COLORS: Record<Method, string> = {
  GET: 'bg-emerald-500',
  POST: 'bg-amber-500',
  PATCH: 'bg-violet-500',
  DELETE: 'bg-red-500',
};

function StatusBadge({ status }: { status: number | null }) {
  if (status === null) return null;
  const isSuccess = status >= 200 && status < 300;
  return (
    <span className={cn(
      'ml-2 rounded-full px-2 py-0.5 text-xs font-mono',
      isSuccess ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400',
    )}>
      {status}
    </span>
  );
}

function EndpointCard({
  endpoint,
  response,
  loading,
  onSend,
}: {
  endpoint: Endpoint;
  response: ResponseState | null;
  loading: boolean;
  onSend: (values: Record<string, string>) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    const values: Record<string, string> = {};
    for (const [key, value] of data.entries()) {
      values[key] = value as string;
    }
    onSend(values);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-sm">
      <div className="flex items-center gap-3 border-b border-white/5 px-5 py-3">
        <span className={cn(
          'rounded-md px-2 py-0.5 text-xs font-bold font-mono text-white',
          METHOD_COLORS[endpoint.method],
        )}>
          {endpoint.method}
        </span>
        <span className="font-mono text-sm text-white/80">{endpoint.path}</span>
        {response && <StatusBadge status={response.status} />}
        {response && (
          <span className="ml-auto font-mono text-xs text-white/30">
            {response.time}ms
          </span>
        )}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="p-5">
        {endpoint.fields.length > 0 && (
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {endpoint.fields.map((field) => {
              const isPath = endpoint.pathParams?.includes(field.name);
              return (
                <div key={field.name}>
                  <label className="mb-1 block text-xs font-medium text-white/50">
                    {isPath && <span className="mr-1 rounded bg-white/10 px-1 py-px font-mono text-[10px]">:param</span>}
                    {field.name}
                    {field.required && <span className="ml-0.5 text-red-400">*</span>}
                  </label>
                  <input
                    name={field.name}
                    type={field.type}
                    required={field.required}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors"
                  />
                </div>
              );
            })}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'rounded-lg px-5 py-2 text-sm font-medium transition-all',
            'bg-white text-black hover:bg-white/90 active:scale-[0.97]',
            loading && 'opacity-50 cursor-not-allowed',
          )}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>

      {response && (
        <div className="border-t border-white/5 p-5">
          <div className="text-xs font-medium text-white/40 mb-2">Response</div>
          <pre className="max-h-64 overflow-auto rounded-lg bg-black/30 p-4 text-xs font-mono text-white/70 whitespace-pre-wrap break-all">
            {JSON.stringify(response.body, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

export default function TestDashboard() {
  const [session, setSession] = useState<{ email: string } | null>(null);
  const [responses, setResponses] = useState<Record<string, ResponseState | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const sendRequest = useCallback(async (endpoint: Endpoint, values: Record<string, string>) => {
    setLoading((prev) => ({ ...prev, [endpoint.id]: true }));
    setResponses((prev) => ({ ...prev, [endpoint.id]: null }));

    const start = performance.now();

    // Replace path params in URL
    let url = endpoint.path;
    if (endpoint.pathParams) {
      for (const param of endpoint.pathParams) {
        url = url.replace(`{${param}}`, values[param] ?? '');
      }
    }

    // Build body from non-path fields
    const bodyFields = endpoint.fields.filter(
      (f) => !endpoint.pathParams?.includes(f.name),
    );
    const body: Record<string, string> = {};
    for (const field of bodyFields) {
      if (values[field.name] !== undefined && values[field.name] !== '') {
        body[field.name] = values[field.name];
      }
    }

    try {
      let res: Response;
      if (endpoint.method === 'GET') {
        res = await fetch(url);
      } else {
        res = await fetch(url, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
          body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
        });
      }

      const elapsed = Math.round(performance.now() - start);
      const responseBody = await res.json();

      setResponses((prev) => ({
        ...prev,
        [endpoint.id]: { status: res.status, body: responseBody, time: elapsed },
      }));

      if ((endpoint.id === 'login' || endpoint.id === 'signup') && res.ok) {
        setSession({ email: values.email });
      }
      if (endpoint.id === 'logout' && res.ok) {
        setSession(null);
      }
      // After create-circle, stash the circleId for subsequent requests
      if (endpoint.id === 'create-circle' && res.ok && responseBody.data?.id) {
        // ponytail: auto-fill would be nice but manual copy is fine for a test page
      }
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      setResponses((prev) => ({
        ...prev,
        [endpoint.id]: { status: 0, body: { error: String(err) }, time: elapsed },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [endpoint.id]: false }));
    }
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1 className="text-2xl font-semibold tracking-tight">API Test Dashboard</h1>
          <div className="mt-2 flex items-center gap-3">
            <div className={cn(
              'h-2 w-2 rounded-full',
              session ? 'bg-emerald-400' : 'bg-white/20',
            )} />
            <span className="text-sm text-white/50">
              {session ? `Signed in as ${session.email}` : 'No active session'}
            </span>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-10 space-y-4"
        >
          {ENDPOINTS.map((ep) => (
            <motion.div key={ep.id} variants={cardVariants}>
              <EndpointCard
                endpoint={ep}
                response={responses[ep.id] ?? null}
                loading={loading[ep.id] ?? false}
                onSend={(values) => sendRequest(ep, values)}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
