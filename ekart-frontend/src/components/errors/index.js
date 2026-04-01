/**
 * Error Pages Export
 * Central export for all error page components
 */

export { Forbidden403 } from './Forbidden403';
export { NotFound404 } from './NotFound404';
export { ErrorPage } from './ErrorPage';
export { GeoBlocked } from './GeoBlocked';

/**
 * Error Pages Map
 * Maps error codes to component exports
 */
export const errorPageComponents = {
  '403': {
    component: 'Forbidden403',
    statusCode: 403,
    title: 'Access Denied',
    description: 'User does not have permission to access resource',
    defaultMessage: "You don't have permission to view this page.",
  },
  '404': {
    component: 'NotFound404',
    statusCode: 404,
    title: 'Page Not Found',
    description: 'Requested resource does not exist',
    defaultMessage: 'The page you are looking for does not exist.',
  },
  '500': {
    component: 'ErrorPage',
    statusCode: 500,
    title: 'Server Error',
    description: 'Internal server error occurred',
    defaultMessage: 'The server encountered an error. Please try again later.',
  },
  'GEO_BLOCKED': {
    component: 'GeoBlocked',
    title: 'Geo Blocked',
    description: 'User location is restricted (outside India)',
    defaultMessage: 'Service not available in your region.',
  },
};

/**
 * Helper function to render error page by code
 */
export const renderErrorPage = (errorCode, props = {}) => {
  const errorConfig = errorPageComponents[errorCode];
  if (!errorConfig) return null;

  const Component = require(`./${errorConfig.component}`)[errorConfig.component];
  return <Component {...props} />;
};
