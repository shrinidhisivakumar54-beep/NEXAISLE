// Generic adult size estimates, not a product-specific chart or fit recommendation.
export function estimateFit(cm){
 if(!Number.isFinite(cm)||cm<20||cm>33) return null;
 const eu=Math.round((cm+1.5)*1.5*2)/2;
 const uk=Math.round((cm/2.54*3-23)*2)/2;
 return {eu,uk,usMen:uk+1,usWomen:uk+2.5};
}
