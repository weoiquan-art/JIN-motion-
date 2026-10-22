// Penang coastline, [lon, lat], from Natural Earth 1:10m land (public domain),
// clipped to the map window. Coarse on purpose: it is drawn as a smoothed
// flat illustration, not a survey map.

export const ISLAND: [number, number][] = [
  [100.3098, 5.4508], [100.3185, 5.4353], [100.334, 5.4269], [100.3434, 5.4176], [100.3252, 5.3833],
  [100.3208, 5.3445], [100.3167, 5.3266], [100.2922, 5.2805], [100.2887, 5.2627], [100.2347, 5.2727],
  [100.195, 5.2723], [100.1897, 5.2665], [100.18, 5.2733], [100.179, 5.278], [100.1927, 5.286],
  [100.1961, 5.3], [100.1912, 5.3525], [100.1931, 5.3993], [100.1863, 5.4162], [100.1795, 5.4269],
  [100.1852, 5.4443], [100.1795, 5.4582], [100.1921, 5.463], [100.2012, 5.4485], [100.2106, 5.444],
  [100.2245, 5.4529], [100.2347, 5.4645], [100.2538, 5.4691], [100.2741, 5.4685], [100.2933, 5.4626],
];

// Mainland coast south → north, then closed far to the east.
export const MAINLAND: [number, number][] = [
  [100.43, 4.9], [100.3957, 5.0134], [100.3723, 5.0614], [100.3645, 5.0843], [100.3742, 5.0919],
  [100.3888, 5.1057], [100.409, 5.1267], [100.4163, 5.1596], [100.4309, 5.1906], [100.4333, 5.2112],
  [100.4212, 5.2424], [100.4212, 5.2606], [100.4312, 5.279], [100.43, 5.3029], [100.406, 5.3484],
  [100.3853, 5.3769], [100.3802, 5.3907], [100.3787, 5.4133], [100.3849, 5.4993], [100.3784, 5.5228],
  [100.3557, 5.5627], [100.3508, 5.5842], [100.344, 5.6693], [100.37, 5.72], [100.36, 5.85],
  [100.9, 5.85], [100.9, 4.9],
];

export const PLACES = {
  butterworth: [100.3792, 5.3995] as [number, number],
  georgeTown: [100.3395, 5.4175] as [number, number],
  bukitMertajam: [100.466, 5.363] as [number, number],
};

// Routes that all pass through Butterworth.
export const ROUTES = {
  ferry: [PLACES.butterworth, [100.36, 5.414], PLACES.georgeTown] as [number, number][],
  bridge: [[100.4, 5.356], [100.322, 5.355]] as [number, number][],
  bridge2: [[100.424, 5.244], [100.293, 5.281]] as [number, number][],
  railSouth: [PLACES.butterworth, [100.41, 5.385], PLACES.bukitMertajam, [100.478, 5.29], [100.49, 5.1]] as [number, number][],
  railNorth: [PLACES.bukitMertajam, [100.47, 5.45], [100.455, 5.62]] as [number, number][],
};
