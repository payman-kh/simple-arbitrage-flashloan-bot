import {PriceList} from '../services/priceAggregtor/priceAggregator.js'

const PRICE_TOLERANCE = 0.001; // 0.1%

export function comparePriceLists(priceListA: PriceList, priceListB: PriceList): boolean {
    if (priceListA.length !== priceListB.length) return false;

    for (const entryA of priceListA) {
        // find matching entry in B by pair
        const entryB = priceListB.find(
            e => e.pair.baseToken === entryA.pair.baseToken && e.pair.quoteToken === entryA.pair.quoteToken
        );
        if (!entryB) return false; // missing pair in B

        // map DEX name -> price for each entry
        const mapA = new Map(entryA.results.map(r => [r.name, r.price]));
        const mapB = new Map(entryB.results.map(r => [r.name, r.price]));

        if (mapA.size !== mapB.size) return false; // different number of DEX quotes

        // compare prices per DEX with tolerance
        for (const [name, priceA] of mapA.entries()) {
            const priceB = mapB.get(name);
            if (priceB === undefined) return false; // missing DEX in B

            const relativeDiff = Math.abs(priceA - priceB) / priceB;
            if (relativeDiff > PRICE_TOLERANCE) return false; // price difference too large
        }
    }

    return true; // all entries match within tolerance
}
