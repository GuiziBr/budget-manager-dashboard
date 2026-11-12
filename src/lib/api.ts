import type { PagedResponse } from "@/types"
import { type QueryParams, withQuery } from "./build-query"
import { API_BASE_URL } from "./constants"

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number
	) {
		super(message)
		this.name = "ApiError"
	}
}

/** Validation failures come as a list of issues; keep them as JSON text so nothing is lost. */
function errorMessage(message: unknown): string {
	if (typeof message === "string") return message
	return message === undefined || message === null
		? ""
		: JSON.stringify(message)
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

interface FetchOptions extends RequestInit {
	data?: unknown
}

/** Result of `getWithHeaders`: lists whose total is in the `x-total-count` header. */
export interface PaginatedResponse<T> {
	data: T
	totalCount: number
}

class ApiClient {
	private buildConfig(
		method: HttpMethod,
		options: FetchOptions = {}
	): RequestInit {
		const { data, headers, ...customConfig } = options

		return {
			method,
			headers: {
				"Content-Type": "application/json",
				...headers
			},
			...(data ? { body: JSON.stringify(data) } : {}),
			...customConfig
		}
	}

	private async fetch(
		endpoint: string,
		method: HttpMethod,
		options: FetchOptions = {}
	): Promise<Response> {
		const config = this.buildConfig(method, options)

		const response = await fetch(`${API_BASE_URL}/${endpoint}`, config)

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}))
			throw new ApiError(
				errorMessage(errorData.message) || `API Error: ${response.status}`,
				response.status
			)
		}

		return response
	}

	private async request<T>(
		endpoint: string,
		method: HttpMethod,
		options: FetchOptions = {}
	): Promise<T> {
		const response = await this.fetch(endpoint, method, options)

		// Handle 204 No Content
		if (response.status === 204) {
			return {} as T
		}

		return response.json()
	}

	get<T>(endpoint: string, options?: FetchOptions) {
		return this.request<T>(endpoint, "GET", options)
	}

	/**
	 * GET request that also returns the `x-total-count` header.
	 * Use this for paginated list endpoints.
	 */
	async getWithHeaders<T>(
		endpoint: string,
		options?: FetchOptions
	): Promise<PaginatedResponse<T>> {
		const response = await this.fetch(endpoint, "GET", options)
		const data: T = await response.json()
		const totalCount = Number(response.headers.get("x-total-count") ?? "0")

		return { data, totalCount }
	}

	/**
	 * GET request for lists that put the total in the body
	 * (`{ data, total, page, limit }`), such as `GET /expenses`.
	 * Returns the body as is. Undefined params are left out of the query, and an existing query on
	 * the endpoint is kept.
	 */
	getPage<T extends PagedResponse<unknown>>(
		endpoint: string,
		params: QueryParams = {},
		options?: FetchOptions
	) {
		return this.request<T>(withQuery(endpoint, params), "GET", options)
	}

	post<T>(endpoint: string, data?: unknown, options?: FetchOptions) {
		return this.request<T>(endpoint, "POST", { ...options, data })
	}

	put<T>(endpoint: string, data?: unknown, options?: FetchOptions) {
		return this.request<T>(endpoint, "PUT", { ...options, data })
	}

	patch<T>(endpoint: string, data?: unknown, options?: FetchOptions) {
		return this.request<T>(endpoint, "PATCH", { ...options, data })
	}

	delete<T>(endpoint: string, options?: FetchOptions) {
		return this.request<T>(endpoint, "DELETE", options)
	}
}

export const api = new ApiClient()
