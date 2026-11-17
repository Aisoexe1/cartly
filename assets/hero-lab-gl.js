// WebGL-шейдери для hero-lab.html, по мотивах трендів 2026 (Paper Shaders, Codrops Bayer dithering,
// Apple Liquid Glass, liquid metal, grainy blur). Код написаний з нуля.
// mount(el, id, palette, getRect) -> { destroy }

const HEAD = `precision highp float;
uniform vec2 u_res; uniform float u_t; uniform vec2 u_m; uniform float u_mOn;
uniform vec3 u_bg; uniform vec3 u_a; uniform vec3 u_ink; uniform vec3 u_s; uniform vec4 u_rect;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; mat2 m=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<5;i++){ v+=a*noise(p); p=m*p; a*=.5; } return v; }
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float grain(){ return hash(gl_FragCoord.xy + fract(u_t*7.)*100.) - .5; }
// маска: ліва третина спокійніша, щоб заголовок читався
float calm(){ float x=gl_FragCoord.x/u_res.x; return smoothstep(.12,.6,x); }
vec2 suv(){ return (gl_FragCoord.xy - .5*u_res)/u_res.y; }
`;

const S = {
  // Рідкий хром: подвійне спотворення шуму, смуги віддзеркалень і тонкий райдужний відлив
  chrome: `void main(){ vec2 uv=suv(); uv.x-=.25; float t=u_t*.12;
    vec2 q=vec2(fbm(uv*1.6+t), fbm(uv*1.6-t+5.2));
    vec2 r=vec2(fbm(uv*1.6+3.5*q+vec2(1.7,9.2)+t*.7), fbm(uv*1.6+3.5*q+vec2(8.3,2.8)-t*.6));
    float f=fbm(uv*1.6+3.5*r);
    float bands=.5+.5*sin(f*11.+r.x*4.);
    float lum=pow(bands,2.2)*.9 + pow(bands,30.)*.6;
    vec3 irid=.5+.5*cos(6.2831*(f*1.4+r.y+vec3(0.,.12,.25)));
    vec3 metal=mix(u_bg, mix(vec3(lum), u_a*lum*1.3, .35), .95);
    metal+=irid*.12*bands;
    float k=smoothstep(.3,.75,gl_FragCoord.x/u_res.x); vec3 col=mix(u_bg, metal, k*.95);
    gl_FragColor=vec4(col+grain()*.04,1.); }`,

  // Bayer-дизер 8x8 (Codrops 2025): двоколірне поле, курсор лишає хвилю
  dither: `float bayer(vec2 p){ vec2 q=mod(p,8.); int x=int(q.x), y=int(q.y); float v=0.;
      // 8x8 через три рівні 2x2
      vec2 a=mod(q,2.), b=mod(floor(q/2.),2.), c=mod(floor(q/4.),2.);
      float A=(a.x==0.?(a.y==0.?0.:2.):(a.y==0.?3.:1.)), B=(b.x==0.?(b.y==0.?0.:2.):(b.y==0.?3.:1.)), C=(c.x==0.?(c.y==0.?0.:2.):(c.y==0.?3.:1.));
      return (A*16.+B*4.+C)/64.; }
    void main(){ float px=3.; vec2 cell=floor(gl_FragCoord.xy/px); vec2 uv=cell*px/u_res.y; float t=u_t*.08;
      float f=fbm(uv*2.2+vec2(t,-t*.7)+fbm(uv*1.3-t)*1.5);
      float x=gl_FragCoord.x/u_res.x; f=f*1.25*smoothstep(.15,.8,x)+(x-.5)*.25;
      if(u_mOn>.5){ float d=length(gl_FragCoord.xy/u_res.y-u_m*vec2(u_res.x/u_res.y,1.)); f+=.35*sin(d*30.-u_t*5.)*exp(-d*5.); }
      float on=step(bayer(cell), f);
      gl_FragColor=vec4(mix(u_bg,u_a,on),1.); }`,

  // Зернистий блюр: три великі світні кулі й сильне плівкове зерно
  grainorb: `void main(){ vec2 uv=suv(); float t=u_t*.2; vec3 col=u_bg;
    vec2 p1=vec2(.55+.12*sin(t),.15+.15*cos(t*.8)), p2=vec2(.85+.1*cos(t*.7),-.25+.12*sin(t*1.1)), p3=vec2(.2+.15*sin(t*.6+2.),-.45);
    col=mix(col,u_a, smoothstep(.75,0.,length(uv-p1))*.95);
    col=mix(col,u_s, smoothstep(.6,0.,length(uv-p2))*.9);
    col=mix(col,u_ink, smoothstep(.5,0.,length(uv-p3))*.35);
    gl_FragColor=vec4(col+grain()*.11,1.); }`,

  // Liquid Glass: лінза з заломленням і хроматичною аберацією над смугастим градієнтом
  glass: `vec3 scene(vec2 uv){ float t=u_t*.15; float v=sin((uv.x*3.+uv.y*1.5)*3.+fbm(uv*2.+t)*4.+t*3.);
      vec3 c=mix(u_bg, u_a, smoothstep(-.2,1.,v)*.85*calm()); return mix(c, u_s, smoothstep(.6,1.,fbm(uv*3.-t))*.5); }
    void main(){ vec2 uv=suv(); vec2 m=u_mOn>.5 ? (u_m-.5)*vec2(u_res.x/u_res.y,1.) : vec2(.45+.12*sin(u_t*.5), .05*cos(u_t*.4));
      vec2 d=uv-m; float r=.24, l=length(d); vec3 col;
      if(l<r){ float z=sqrt(r*r-l*l)/r; vec2 n=d/r; vec2 off=n*(1.-z)*.25;
        col=vec3(scene(uv-off*1.).r, scene(uv-off*1.08).g, scene(uv-off*1.16).b);
        col+=pow(1.-z,4.)*.6 + smoothstep(.0,.02,r-l)*0.; col=mix(col, vec3(1.), pow(max(0.,dot(n,normalize(vec2(-.6,.8)))),6.)*(1.-z)*.7);
      } else { col=scene(uv); col*=1.-.25*exp(-(l-r)*18.); }
      gl_FragColor=vec4(col+grain()*.03,1.); }`,

  // Хвиля в стилі Stripe: нахилена площина градієнта, що дихає
  stripe: `void main(){ vec2 uv=gl_FragCoord.xy/u_res; float t=u_t*.12; vec2 p=uv; p.y+= (p.x-.5)*.6;
    float w=sin(p.x*3.+t*2.)*.12+sin(p.x*7.-t*1.3)*.05+fbm(p*2.+t)*.25;
    float y=p.y-.45-w; float k1=smoothstep(.0,.35,y)-smoothstep(.35,.9,y); float k2=smoothstep(-.3,.0,y)*(1.-smoothstep(0.,.25,y));
    vec3 col=u_bg; col=mix(col,u_a,k1*.95); col=mix(col,u_s,k2*.9); col=mix(col,u_ink,smoothstep(.55,1.,y)*.0);
    col=mix(u_bg,col,smoothstep(.0,.45,uv.x)*.9+.1);
    gl_FragColor=vec4(col+grain()*.035,1.); }`,

  // Димне кільце (Paper Shaders smoke ring): світне кільце, краї рвані шумом
  ring: `void main(){ vec2 uv=suv(); vec2 c=vec2(.48,.0); vec2 d=uv-c; float a=atan(d.y,d.x), l=length(d);
    float n=fbm(vec2(a*1.5+u_t*.25, l*3.-u_t*.4))-.5; float R=.32+n*.12;
    float ring=exp(-pow((l-R)*9.,2.)); float glow=exp(-abs(l-R)*5.)*.35; float core=exp(-l*6.)*.25;
    vec3 col=u_bg + u_a*(ring*1.1+glow) + u_s*core;
    gl_FragColor=vec4(col+grain()*.05,1.); }`,

  // Нейро-шум: неонові «нервові» лінії з обертових синусів
  neuro: `void main(){ vec2 uv=suv()*1.1; uv.x-=.3; float t=u_t*.25;
    vec2 acc=vec2(0.), res=vec2(0.); float sc=8.;
    for(int j=0;j<15;j++){ uv=rot(1.)*uv; acc=rot(1.)*acc; vec2 layer=uv*sc+float(j)+acc-t; acc+=sin(layer); res+=(.5+.5*cos(layer))/sc; sc*=1.2; }
    float n=res.x+res.y; n=pow(n,3.)*.7*calm();
    vec3 col=u_bg+u_a*n+u_s*pow(n,2.)*.5;
    gl_FragColor=vec4(col,1.); }`,

  // Посилки: рельєф з заокруглених коробок, хвиля проходить полем (raymarching)
  parcels: `float sdBox(vec3 p, vec3 b, float r){ vec3 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r; }
    float hgt(vec2 id){ return .25+.22*sin(length(id-vec2(2.,0.))*.7-u_t*1.6)+.08*sin(id.x*1.3+id.y*.7+u_t); }
    float map(vec3 p){ vec2 id=floor(p.xz+.5); float d=1e9;
      for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++){ vec2 c=id+vec2(i,j); float h=hgt(c); vec3 q=p-vec3(c.x,h*.5,c.y); d=min(d, sdBox(q, vec3(.38,h*.5,.38), .08)); }
      return min(d, p.y); }
    vec3 nor(vec3 p){ vec2 e=vec2(.002,0); return normalize(vec3(map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx))); }
    void main(){ vec2 uv=suv(); vec3 ro=vec3(7.,6.5,7.), ta=vec3(1.5,0.,-1.); vec3 f=normalize(ta-ro), r=normalize(cross(f,vec3(0,1,0))), up=cross(r,f);
      vec3 rd=normalize(f*2.2+(uv.x-.25)*r*1.6+uv.y*up*1.6); float t=0.; float hit=0.;
      for(int i=0;i<90;i++){ vec3 p=ro+rd*t; float d=map(p); if(d<.002){hit=1.;break;} t+=d*.8; if(t>40.)break; }
      vec3 col=u_bg;
      if(hit>.5){ vec3 p=ro+rd*t; vec3 n=nor(p); float dif=clamp(dot(n,normalize(vec3(.5,1.,.3))),0.,1.);
        float top=step(.9,n.y)*step(.02,p.y); vec3 base=mix(u_s, u_a, top); col=base*(.45+.65*dif);
        col=mix(col,u_bg,smoothstep(8.,22.,t)); }
      col=mix(u_bg,col,calm()*.9+.1);
      gl_FragColor=vec4(col+grain()*.03,1.); }`,

  // Растр: точки, розмір яких задає хвиля шуму, як друк журналу
  halftone: `void main(){ float s=11.; vec2 g=rot(.4)*gl_FragCoord.xy; vec2 cell=floor(g/s)+.5; vec2 f=g/s-cell;
    vec2 cp=rot(-.4)*(cell*s)/u_res.y; float t=u_t*.12;
    float v=fbm(cp*2.+vec2(t,-t))*1.3+ (rot(-.4)*(cell*s)).x/u_res.x*.6-.35; v=clamp(v,0.,1.)*calm();
    float d=length(f); float on=smoothstep(v*.62, v*.62-.06, d);
    gl_FragColor=vec4(mix(u_bg,u_a,on),1.); }`,

  // Світна рамка навколо вікна замовлень (як Apple Intelligence): світло біжить по периметру
  border: `float sdR(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r; }
    void main(){ vec2 px=gl_FragCoord.xy; vec2 c=u_rect.xy+u_rect.zw*.5; vec2 b=u_rect.zw*.5;
      float d=sdR(px-c,b,16.); vec2 q=px-c; float a=atan(q.y,q.x);
      float flow=.5+.5*sin(a*2.-u_t*1.6)+ .3*sin(a*5.+u_t*2.3);
      vec3 hue=mix(u_a,u_s,.5+.5*sin(a*3.+u_t));
      float glow=exp(-max(d,0.)/38.)*.9*flow + exp(-abs(d)/3.)*.8;
      float bgn=fbm(px/u_res.y*2.+u_t*.05)*.06;
      vec3 col=u_bg+bgn+hue*glow;
      gl_FragColor=vec4(col+grain()*.03,1.); }`,

  // Голографічна фольга: заломи фольги, світло ковзає, райдужний відлив у фірмових тонах
  foil: `void main(){ vec2 uv=suv(); float t=u_t*.15;
    float h=fbm(uv*1.4+vec2(t,t*.5))*1.2; vec2 e=vec2(.004,0);
    float hx=fbm((uv+e.xy)*1.4+vec2(t,t*.5))*1.2-fbm((uv-e.xy)*1.4+vec2(t,t*.5))*1.2;
    float hy=fbm((uv+e.yx)*1.4+vec2(t,t*.5))*1.2-fbm((uv-e.yx)*1.4+vec2(t,t*.5))*1.2;
    vec3 n=normalize(vec3(-hx*22.,-hy*22.,1.)); vec2 L=u_mOn>.5? (u_m-.5)*2. : vec2(sin(u_t*.4),cos(u_t*.3))*.7;
    float spec=pow(max(0.,dot(n,normalize(vec3(L,1.)))),18.);
    vec3 film=.5+.5*cos(6.2831*(h*1.6+n.x*.8+vec3(0.,.15,.3)));
    vec3 tint=mix(u_a,u_s,film.g); vec3 col=mix(u_bg, tint*(.55+.6*film.r), .85*calm()+.1)+spec*.7*calm();
    gl_FragColor=vec4(col+grain()*.03,1.); }`,

  // Чорнило у воді: доменне спотворення у високій роздільності, два кольори
  ink: `void main(){ vec2 uv=suv()*1.3; float t=u_t*.07;
    vec2 q=vec2(fbm(uv+t), fbm(uv+vec2(5.2,1.3)-t));
    vec2 r=vec2(fbm(uv+4.*q+vec2(1.7,9.2)+t*1.5), fbm(uv+4.*q+vec2(8.3,2.8)));
    float f=fbm(uv+4.*r);
    float ink=smoothstep(.45,.75,f*f*1.6+length(q)*.4)*calm();
    float edge=smoothstep(.02,.0,abs(f*f*1.6+length(q)*.4-.6))*calm()*.35;
    vec3 col=mix(u_bg,u_a,ink)+u_s*edge;
    gl_FragColor=vec4(col+grain()*.035,1.); }`,
};

function hex3(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }

export function mountGL(el, id, palette, getRect) {
  const cv = document.createElement('canvas'); cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%'; el.appendChild(cv);
  const gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (!gl) { el.style.background = palette.bg; return { destroy() {} }; }
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(id + ': ' + gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }'));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, HEAD + S[id]));
  gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);
  gl.uniform3fv(U('u_bg'), hex3(palette.bg)); gl.uniform3fv(U('u_a'), hex3(palette.accent)); gl.uniform3fv(U('u_ink'), hex3(palette.ink)); gl.uniform3fv(U('u_s'), hex3(palette.surface));
  let mouse = null; const host = el.closest('.hero') || el;
  const mv = e => { const r = cv.getBoundingClientRect(); mouse = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]; };
  const lv = () => { mouse = null; };
  host.addEventListener('pointermove', mv); host.addEventListener('pointerleave', lv);
  const heavy = id === 'parcels';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, alive = true; const t0 = performance.now();
  const frame = now => { if (!alive) return;
    const d = Math.min(devicePixelRatio || 1, heavy ? 1 : 1.5), w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
    gl.viewport(0, 0, cv.width, cv.height);
    gl.uniform2f(U('u_res'), cv.width, cv.height); gl.uniform1f(U('u_t'), reduce ? 4 : (now - t0) / 1000);
    gl.uniform2f(U('u_m'), mouse ? mouse[0] : .5, mouse ? mouse[1] : .5); gl.uniform1f(U('u_mOn'), mouse ? 1 : 0);
    if (getRect) { const cr = cv.getBoundingClientRect(), r = getRect(); if (r) gl.uniform4f(U('u_rect'), (r.left - cr.left) * d, (cr.bottom - r.bottom) * d, r.width * d, r.height * d); }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduce) raf = requestAnimationFrame(frame); };
  raf = requestAnimationFrame(frame);
  return { destroy() { alive = false; cancelAnimationFrame(raf); host.removeEventListener('pointermove', mv); host.removeEventListener('pointerleave', lv); gl.getExtension('WEBGL_lose_context')?.loseContext(); } };
}
