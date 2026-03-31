import { toggleFollow } from "@/app/ask/[username]/actions";

type FollowButtonProps = {
  username: string;
  isFollowing: boolean;
};

export function FollowButton({ username, isFollowing }: FollowButtonProps) {
  return (
    <form action={toggleFollow.bind(null, username)}>
      <button className="secondary-button" type="submit">
        {isFollowing ? "フォロー中" : "フォローする"}
      </button>
    </form>
  );
}
