import type { ServiceRequest } from './request.js';
import type { ServiceRequestFactory } from './ServiceRequestFactory.js';
export declare function requestFactory<T extends string, P, R>(requestType: T): ServiceRequestFactory<ServiceRequest<T, P, R>>;
//# sourceMappingURL=requestFactory.d.ts.map