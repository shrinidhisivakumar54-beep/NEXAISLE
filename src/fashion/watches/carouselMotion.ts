export const CAROUSEL_RADIUS=3.25;
export function orbitPosition(angle:number,index:number):[number,number]{const phase=angle+index*Math.PI/2;return [CAROUSEL_RADIUS*Math.sin(phase),CAROUSEL_RADIUS*Math.cos(phase)]}
export function advanceCarousel(angle:number,pending:number,delta:number,playing:boolean,selected:boolean,reduced:boolean):[number,number]{if(selected)return [angle,pending];const dt=Math.min(Math.max(delta,0),.05),step=pending*(1-Math.exp(-dt*3));return [angle+step+(playing?dt*(reduced?.055:.11):0),pending-step]}
