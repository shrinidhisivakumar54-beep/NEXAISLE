export const sneakers = [
 {id:'knit',name:'Knit / 01',type:'TEXTURED RUNNER',file:'/shoes/shoe.glb',credit:'Shopify · CC BY 4.0',parts:false,up:'y',description:'A finely textured knit runner with sculpted rubber tooling. Original Shopify sample model.'},
 {id:'running',name:'Velocity / 02',type:'SCANNED RUNNER',file:'/shoes/real-1.glb',anatomy:'/shoes/running.glb',credit:'Google Scanned Objects · CC BY-SA 4.0',parts:false,up:'y',description:'A textured scan of ASICS GEL-Blur33 2.0 GS, preserving the real shoe’s surface detail. This exterior scan has no separable internal components.'},
 {id:'high-top',name:'Courtline / 03',type:'SCANNED HIGH-TOP',file:'/shoes/real-0.glb',anatomy:'/shoes/high-top.glb',credit:'Google Scanned Objects · CC BY-SA 4.0',parts:false,up:'y',description:'A textured scan of adidas Court Attitude. This exterior scan has no separable internal components.'},
 {id:'court',name:'Court / 04',type:'SCANNED COURT SHOE',file:'/shoes/court.glb',credit:'Google Scanned Objects · CC BY-SA 4.0',parts:false,up:'y',description:'A textured 3D scan of an ASICS GEL-Challenger 9. Historical reference scan; no affiliation or live inventory.'},
 {id:'extra-0',name:'Altitude / 05',type:'BASKETBALL HIGH-TOP',file:'/shoes/extra-0.glb',credit:'Google Scanned Objects · CC BY-SA 4.0',parts:false,up:'y',description:'A textured 3D scan of adidas Crazy 8. Historical reference scan; no brand affiliation or live inventory.'},
 {id:'extra-1',name:'Heritage / 06',type:'COURT CLASSIC',file:'/shoes/extra-1.glb',credit:'Google Scanned Objects · CC BY-SA 4.0',parts:false,up:'y',description:'A textured 3D scan of adidas Grand Prix. Historical reference scan; no brand affiliation or live inventory.'},
 {id:'extra-2',name:'Distance / 07',type:'ROAD RUNNER',file:'/shoes/extra-2.glb',credit:'Google Scanned Objects · CC BY-SA 4.0',parts:false,up:'y',description:'A textured 3D scan of Brooks Ghost 6. Historical reference scan; no brand affiliation or live inventory.'},
 {id:'extra-3',name:'Archive / 08',type:'RETRO LOW-TOP',file:'/shoes/extra-3.glb',credit:'Google Scanned Objects · CC BY-SA 4.0',parts:false,up:'y',description:'A textured 3D scan of adidas Dragon W. Historical reference scan; no brand affiliation or live inventory.'},
 {id:'airflow',name:'Airflow / 09',type:'VENTILATED RUNNER',file:'/shoes/real-2.glb',credit:'Google Scanned Objects · CC BY-SA 4.0',parts:false,up:'y',description:'A textured 3D scan of adidas ClimaCool Aerate 2 W Wide. Historical reference scan; no affiliation or live product inventory.'},
] as const;
export const layers=[
 {id:'upper',name:'Upper',detail:'The outer structure wraps and supports the foot. This model includes the tongue and reinforcing overlays in this group.',offset:1.05},
 {id:'laces',name:'Laces & eyelets',detail:'The closure distributes tension across the upper to help hold the foot in place.',offset:1.8},
 {id:'insole',name:'Insole',detail:'The foot-facing layer provides an interior contact surface. Its shape is not a validated fit measurement.',offset:.55},
 {id:'midsole',name:'Midsole / foxing',detail:'The running model has a separate EVA midsole. The canvas model instead exposes its rubber foxing and toe-cap assembly.',offset:-.25},
 {id:'outsole',name:'Outsole',detail:'The ground-contact rubber layer provides a durable traction surface.',offset:-.85},
] as const;
