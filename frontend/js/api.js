"use strict";

(function() {
  const DEFAULT_BACKEND_PORT = '8080';

  function inferBackendOrigin() {
    if (typeof window.API_BASE_URL === 'string' && window.API_BASE_URL.trim()) {
      return window.API_BASE_URL.trim().replace(/\/$/, '');
    }

    const { protocol, hostname, port } = window.location;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      if (port && port !== DEFAULT_BACKEND_PORT) {
        return `${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}`;
      }
      return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
    }

    return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
  }

  const backendOrigin = inferBackendOrigin();

  window.buildApiUrl = function(path) {
    if (!path) {
      return backendOrigin;
    }

    const normalisedPath = path.startsWith('/') ? path : `/${path}`;

    try {
      return new URL(normalisedPath, backendOrigin).toString();
    } catch (err) {
      console.warn('buildApiUrl: falling back to string concatenation', err);
      return `${backendOrigin}${normalisedPath}`;
    }
  };
})();
