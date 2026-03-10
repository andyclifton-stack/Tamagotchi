import { describe, expect, it } from 'vitest';
import {
  SHARED_PROFILE_ID,
  buildPetProfileFields,
  createKidProfile,
  getDisplayProfiles,
  getPetsForProfile,
  touchKidProfile
} from '../profiles';

describe('profile helpers', () => {
  it('creates and touches kid profiles', () => {
    const now = Date.parse('2026-03-10T09:00:00Z');
    const profile = createKidProfile({ name: '  Millie  ', avatarId: 'heart' }, now);

    expect(profile.name).toBe('Millie');
    expect(profile.avatarId).toBe('heart');
    expect(profile.createdAt).toBe(now);

    const touched = touchKidProfile(profile, now + 5000);
    expect(touched.lastUsedAt).toBe(now + 5000);
  });

  it('builds display profiles with shared fallback and pet reconstruction', () => {
    const profiles = [{ id: 'kid-1', name: 'Ava', avatarId: 'star', createdAt: 1, lastUsedAt: 4 }];
    const pets = [
      { id: 'pet-1', profileId: '', updatedAt: 30 },
      {
        id: 'pet-2',
        profileId: 'kid-2',
        profileName: 'Noah',
        profileAvatarId: 'moon',
        createdAt: 2,
        updatedAt: 40
      }
    ];

    const displayProfiles = getDisplayProfiles(profiles, pets);
    expect(displayProfiles.map((profile) => profile.id)).toEqual(['kid-2', 'kid-1', SHARED_PROFILE_ID]);
    expect(displayProfiles[0].name).toBe('Noah');
  });

  it('filters pets by profile and shared bucket', () => {
    const pets = [
      { id: 'pet-1', profileId: 'kid-1' },
      { id: 'pet-2', profileId: '' },
      { id: 'pet-3', profileId: 'kid-1' }
    ];

    expect(getPetsForProfile(pets, 'kid-1').map((pet) => pet.id)).toEqual(['pet-1', 'pet-3']);
    expect(getPetsForProfile(pets, SHARED_PROFILE_ID).map((pet) => pet.id)).toEqual(['pet-2']);
  });

  it('builds pet profile fields and clears them for shared', () => {
    expect(
      buildPetProfileFields({ id: 'kid-1', name: 'Ava', avatarId: 'star' })
    ).toEqual({
      profileId: 'kid-1',
      profileName: 'Ava',
      profileAvatarId: 'star'
    });

    expect(
      buildPetProfileFields({ id: SHARED_PROFILE_ID, name: 'Shared', avatarId: 'spark' })
    ).toEqual({
      profileId: '',
      profileName: '',
      profileAvatarId: ''
    });
  });
});
