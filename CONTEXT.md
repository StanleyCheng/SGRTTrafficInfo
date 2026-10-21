# Singapore traffic and transit

Shared language for the traffic map and its planned transit layers.

## Language

**3D map**:
A map with raised building footprints, camera tilt and rotation. In this project, it does not imply photographic building textures.
_Avoid_: Photorealistic city, Google Earth view

**Vehicle livery**:
The real-world paintwork and identifying exterior appearance of a vehicle or fleet. It is distinct from the colour used to identify a transit route.
_Avoid_: Route colour

**Representative fleet icon**:
A researched depiction of a fleet and vehicle type when the data does not identify the individual vehicle. It does not claim that a particular vehicle model or paintwork is operating that trip.
_Avoid_: Exact vehicle, identified vehicle

**Stale vehicle position**:
A previously supported position whose source has stopped updating. Motion stops, the position is briefly marked stale, and the vehicle is hidden when that source's position evidence expires.
_Avoid_: Live position, continuing journey

**Route colour**:
A colour identifying a transit line or route on its route line and label. It does not determine the vehicle body's paintwork.
_Avoid_: Vehicle livery

**ETA-based position estimate**:
A vehicle position inferred from arrival predictions along its route. It is an estimate rather than an observed vehicle GPS position.
_Avoid_: Live GPS, exact location

**Unavailable position**:
A vehicle position for which neither usable GPS nor ETA evidence is available. The route and stops may remain visible, but there is no moving vehicle position to show.
_Avoid_: Scheduled estimate, live vehicle
