interface Friend {
  characterId: string;
  nick: string;
  icon: string;
  lvl: string;
  opLvl: string;
  prof: string;
  location: string;
  x: string;
  y: string;
  status: string;
  unknown1: string;
}

export function parseFriendsListFromEvent(friends: string[]): Friend[] {
  const friendsList: Friend[] = [];
  const entrySize = 11;

  for (let i = 0; i < friends.length; i += entrySize) {
    friendsList.push({
      characterId: friends[i],
      nick: friends[i + 1],
      icon: friends[i + 2],
      lvl: friends[i + 3],
      opLvl: friends[i + 4],
      prof: friends[i + 5],
      location: friends[i + 6],
      x: friends[i + 7],
      y: friends[i + 8],
      status: friends[i + 9],
      unknown1: friends[i + 10],
    });
  }

  return friendsList;
}
