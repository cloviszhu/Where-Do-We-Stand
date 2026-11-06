export type PersonSlot={x:number;y:number;size:number};
/** First two columns have dedicated callout lanes; their markers remain ordinary people. */
export function individualQueue(width:number,height:number,count:number,references:number){
  const columns=width<480?8:10,rows=Math.ceil((count+references)/columns);
  const step=Math.min((width-32)/columns,(height-88)/Math.max(rows,1),68);
  const left=(width-columns*step)/2,top=72+Math.max(0,(height-88-rows*step)/2);
  const size=Math.min(step*.38,15);
  const slots=Array.from({length:count+references},(_,i)=>({x:left+(i%columns+.5)*step,y:top+(Math.floor(i/columns)+.5)*step,size}));
  return {people:slots.slice(references),references:slots.slice(0,references),step};
}

/** Label rectangles live above the queue. Lines terminate above the reserved first row. */
export function identityCallouts(slots:PersonSlot[],width:number){
  return slots.map((p,i)=>{
    const labelWidth=72,labelX=Math.min(width-labelWidth-8,Math.max(8,p.x+(i===0?-80:16)));
    const labelY=i===0?8:35,elbowY=labelY+12;
    return {labelX,labelY,labelWidth,points:[[labelX+(i===0?labelWidth:0),elbowY],[p.x,elbowY],[p.x,p.y-p.size*1.35]]};
  });
}
