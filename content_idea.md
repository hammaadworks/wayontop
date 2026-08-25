how to get started
1. explain why
2. explain the what and how
3. show designs
4. how to get started with coding
- make a github repo
- push your design docs
- make supabase project
- get the api-url, keys (anon and service), share the password so it can create tables on your behalf (you can just ask the ai what do you need)
5. make an parallel agent comm file so they are all in sync what has to be taken next. (got it from bmad)
- make a video how to make supabase projects with passwords. tell them it is lot more powerful if you have the supabase cli, you can have local versions also you can use the magic links and other stuff

---

Process FAQ

- what are the different types of nodes: POI, Stamp, Amenity, Junctions,
- what is VPS, why use LiDAR, why not for Lalbagh
- Devtools MCP : amazing tool for your ai development, especially to fix contrast issues and unused declarations.
- "Rubber banding" effect: locate me recenter on use effect, move it to onclick adn you free to move

---

Vid 1: Problem intro
Vid 2: Project setup
Vid 3: 


---

Stuck?!!

1. permissions:
- pwa
- twa?
- created a unified permissions modal, but how to guide the user?
- it's so easy to miss details while building the app but at the same time as user 
so strict. need to be super empathtic to the user, how he feels how can he use it, how will he use it.
- reward psychology

2. vercel vs cloudflare
- while vercel devx is amazing sometimes considering this is a gift
- https://www.youtube.com/watch?v=ihnGot4nUS4
- so moving to cloudflare entirely, coz i know this is gonna stay for long, In Sha Allah
- see supabase alts now

3. accessibility
- kannada
- color - renderign in the dev tools adn see adn fix
- coverage - see what is bloated and reduce your website size
- css overview and fix it
- webvitals and unlighthouse for performance

4. performance
- prefecting and caching = see when the user is busy with the permisisons we are optimistic so we load the major graphs and stuff sot eh experience is seamless

5. MapLibre GL JS + Vite Production Bug
- Everything works fine locally (map, markers, routes), but in Vercel production, only the GeoJSON line routes disappear without any console errors.
- **Why this happens:** MapLibre relies on a Web Worker to tessellate vector geometries (`type: "line"` or `fill`). Raster tiles and DOM markers don't need this worker. When Vite builds the project for production, the default worker instantiation fails to resolve properly. Because there's no worker to process vector geometry, MapLibre silently drops your GeoJSON routes.
- **The Fix:** Explicitly import the worker as a bundled chunk and inject it into MapLibre before map initialization:
  ```ts
  import { setWorkerUrl } from 'maplibre-gl';
  import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
  setWorkerUrl(workerUrl);
  ```

---

What is snapping and spurring?
snapping = how do you snap the user to the nearest node? 
- go on each node, calculate haversine = o(n)
- use rbush using r-tree = spatial bounding box o(log n)
- 

---

10 tips while using ai coding agents, this is not simple like, giving context or saying think step by step or few shot coz we already know it
this is super practical
1. reverse context prompting - bmad does this amazingly
2. iterative building with commits - catch the mess quickly, this requires patience.
3. roleplay - give each agent differnt code review this as an cybersec is different from senior code engineer. my fav blackhat hacker
4. prompt driven tdd - here you have a file with all the test cases, possibly a sheet and you can just maintain the state, completely abstracting the messy test code layer. 
5. rubber ducking - become a better dev.
6. mcp and skills
7. pair programming between agents - not just pair prog but pm and all stakeholders on it

---

how does a* work?
dijks = dag, -weight: pq = only once for a node
bellford = dag, -weigh cycle
a* = additional heuristic dijs p queue = (value + heuristic)
then now you know the path, draw the line on the map and thats it
but there are optimisations
1. curves: polyline string, avoid waste computations
2. web workers for computations like shortest path
3. use postGIS but think in terms of network in my case i need offline capability so i'll just go with the json blob no postgis, but i'll use message packs

---

nun nodes
1. actively protecting the park adn trash free. mapped all teh trash cans

hidden and constructions 
- we need under constructions and hidden nodes adn edges
events only nodes
---

pm skills
- improve it for whom?
- user research 
- aim assemble achieve
- 