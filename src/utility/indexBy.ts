export function indexBy<T>(
	indexer: (item: T) => string,
	xs: T[]
): { [key: string]: T } {
	return xs.reduce(
		(acc, elm) => Object.assign(acc, { [indexer(elm)]: elm }),
		{});
}

