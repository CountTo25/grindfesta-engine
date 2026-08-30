import type {
  OneOrMany,
  StateCondition,
  StateEffect,
  StateText,
} from "../hooks";

export type LocationPosition<
  LocationId extends string,
  SubLocationId extends string,
> = {
  locationId: LocationId;
  subLocationId: SubLocationId;
};

export type LocationDefinition<State, SubLocationId extends string> = {
  title: StateText<State>;
  initialSubLocationId: SubLocationId;
  subLocations: Readonly<Partial<Record<SubLocationId, StateText<State>>>>;
};

export type LocationConditionMetadata<
  LocationId extends string,
  SubLocationId extends string,
> =
  | { kind: "inLocation"; locationIds: readonly LocationId[] }
  | { kind: "inSubLocation"; subLocationIds: readonly SubLocationId[] };

export type LocationEffectMetadata<
  LocationId extends string,
  SubLocationId extends string,
> = {
  kind: "moveLocation";
  destination: LocationPosition<LocationId, SubLocationId>;
};

export type LocationMechanicsOptions<
  State,
  LocationId extends string,
  SubLocationId extends string,
> = {
  locations: Readonly<Record<LocationId, LocationDefinition<State, SubLocationId>>>;
  getPosition: (state: State) => LocationPosition<LocationId, SubLocationId>;
  setPosition?: (
    state: State,
    position: LocationPosition<LocationId, SubLocationId>,
  ) => State;
  canMove?: (
    state: State,
    destination: LocationPosition<LocationId, SubLocationId>,
  ) => boolean;
};

export type LocationMechanics<
  State,
  LocationId extends string,
  SubLocationId extends string,
> = {
  getPosition: (state: State) => LocationPosition<LocationId, SubLocationId>;
  getLocation: (locationId: LocationId) => LocationDefinition<State, SubLocationId>;
  getSubLocationOwner: (subLocationId: SubLocationId) => LocationId;
  inLocation: (
    locationIds: OneOrMany<LocationId>,
  ) => StateCondition<State, LocationConditionMetadata<LocationId, SubLocationId>>;
  inSubLocation: (
    subLocationIds: OneOrMany<SubLocationId>,
  ) => StateCondition<State, LocationConditionMetadata<LocationId, SubLocationId>>;
  canMoveTo: (
    state: State,
    destination: LocationPosition<LocationId, SubLocationId>,
  ) => boolean;
  moveToLocation: (
    locationId: LocationId,
    subLocationId?: SubLocationId,
  ) => StateEffect<State, LocationEffectMetadata<LocationId, SubLocationId>>;
  moveToSubLocation: (
    subLocationId: SubLocationId,
  ) => StateEffect<State, LocationEffectMetadata<LocationId, SubLocationId>>;
};

function asArray<Value>(value: OneOrMany<Value>): readonly Value[] {
  return Array.isArray(value) ? value : [value as Value];
}

export function createLocationMechanics<
  State,
  LocationId extends string,
  SubLocationId extends string,
>(
  options: LocationMechanicsOptions<State, LocationId, SubLocationId>,
): LocationMechanics<State, LocationId, SubLocationId> {
  const subLocationOwners = new Map<SubLocationId, LocationId>();
  const entries = Object.entries(options.locations) as [
    LocationId,
    LocationDefinition<State, SubLocationId>,
  ][];
  for (const [locationId, definition] of entries) {
    if (!Object.hasOwn(definition.subLocations, definition.initialSubLocationId)) {
      throw new Error(`Initial sub-location is not registered for ${locationId}`);
    }
    for (const rawSubLocationId of Object.keys(definition.subLocations)) {
      const subLocationId = rawSubLocationId as SubLocationId;
      if (subLocationOwners.has(subLocationId)) {
        throw new Error(`Sub-location is registered more than once: ${subLocationId}`);
      }
      subLocationOwners.set(subLocationId, locationId);
    }
  }
  const getLocation = (locationId: LocationId) => {
    const location = options.locations[locationId];
    if (!location) throw new Error(`Unknown location: ${locationId}`);
    return location;
  };
  const getSubLocationOwner = (subLocationId: SubLocationId) => {
    const owner = subLocationOwners.get(subLocationId);
    if (!owner) throw new Error(`Unknown sub-location: ${subLocationId}`);
    return owner;
  };
  const commit = (
    state: State,
    position: LocationPosition<LocationId, SubLocationId>,
  ) => {
    if (options.setPosition) return options.setPosition(state, position);
    Object.assign(options.getPosition(state), position);
    return state;
  };
  const condition = (
    check: (state: State) => boolean,
    metadata: LocationConditionMetadata<LocationId, SubLocationId>,
  ) => Object.assign(check, { metadata });
  const inLocation = (locationIds: OneOrMany<LocationId>) => {
    const ids = [...asArray(locationIds)];
    ids.forEach(getLocation);
    return condition(
      (state) => ids.includes(options.getPosition(state).locationId),
      { kind: "inLocation", locationIds: ids },
    );
  };
  const inSubLocation = (subLocationIds: OneOrMany<SubLocationId>) => {
    const ids = [...asArray(subLocationIds)];
    ids.forEach(getSubLocationOwner);
    return condition(
      (state) => ids.includes(options.getPosition(state).subLocationId),
      { kind: "inSubLocation", subLocationIds: ids },
    );
  };
  const canMoveTo = (
    state: State,
    destination: LocationPosition<LocationId, SubLocationId>,
  ) => {
    const owner = getSubLocationOwner(destination.subLocationId);
    return owner === destination.locationId && (options.canMove?.(state, destination) ?? true);
  };
  const movement = (
    destination: LocationPosition<LocationId, SubLocationId>,
    requireCurrentLocation: boolean,
  ) => Object.assign(
    (state: State) => {
      if (
        requireCurrentLocation &&
        options.getPosition(state).locationId !== destination.locationId
      ) return state;
      return canMoveTo(state, destination) ? commit(state, destination) : state;
    },
    {
      metadata: {
        kind: "moveLocation" as const,
        destination: { ...destination },
      },
    },
  );
  const moveToLocation = (
    locationId: LocationId,
    subLocationId = getLocation(locationId).initialSubLocationId,
  ) => movement({ locationId, subLocationId }, false);
  const moveToSubLocation = (subLocationId: SubLocationId) => movement(
    { locationId: getSubLocationOwner(subLocationId), subLocationId },
    true,
  );
  return {
    getPosition: options.getPosition,
    getLocation,
    getSubLocationOwner,
    inLocation,
    inSubLocation,
    canMoveTo,
    moveToLocation,
    moveToSubLocation,
  };
}
