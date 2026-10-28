/**
 * Editorial photography for the demo boutique. These are not images of the
 * exact demo SKUs: keep that distinction visible wherever images appear.
 * Replace with licensed SKU photography before real-world commerce.
 */
export const fashionImages: Record<string,string> = {
 f0: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1000&q=85',
 f1: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=1000&q=85',
 f2: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=1000&q=85',
 f3: 'https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=1000&q=85',
 f4: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1000&q=85',
 f5: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&q=85',
 f6: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=1000&q=85',
 f7: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1000&q=85',
 f8: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=1000&q=85',
 f9: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1000&q=85',
 f10: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1000&q=85',
 f11: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=1000&q=85'
};
export const railImage = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1800&q=85';
export const fashionImage = (id:string) => fashionImages[id] ?? fashionImages.f0;
