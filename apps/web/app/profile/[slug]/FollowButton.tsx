'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { followUser, unfollowUser } from '../actions';

export function FollowButton({
  slug,
  initiallyFollowing,
}: {
  slug: string;
  initiallyFollowing: boolean;
}) {
  const [isFollowing, setIsFollowing] = useState(initiallyFollowing);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = isFollowing ? await unfollowUser(slug) : await followUser(slug);
      if (res.ok) setIsFollowing(!isFollowing);
      else alert(res.error);
    });
  }

  return (
    <Button onClick={toggle} disabled={pending} variant={isFollowing ? 'ghost' : 'accent'} size="sm">
      {pending ? '…' : isFollowing ? 'Ne plus suivre' : 'Suivre'}
    </Button>
  );
}
