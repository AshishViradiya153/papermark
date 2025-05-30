import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { useTeams } from "@/lib/swr/use-teams";
import { Team } from "@/lib/types";

interface TeamContextProps {
  children: React.ReactNode;
}

export type TeamContextType = {
  teams: Team[];
  currentTeam: Team | null;
  currentTeamId: string | null;
  isLoading: boolean;
  setCurrentTeam: (team: Team) => void;
};

export const initialState = {
  teams: [],
  currentTeam: null,
  currentTeamId: null,
  isLoading: false,
  setCurrentTeam: (team: Team) => {},
};

const TeamContext = createContext<TeamContextType>(initialState);

export const TeamProvider = ({ children }: TeamContextProps): JSX.Element => {
  const { teams, loading } = useTeams();
  const [currentTeam, setCurrentTeamState] = useState<Team | null>(null);

  const setCurrentTeam = useCallback((team: Team) => {
    setCurrentTeamState(team);
  }, []);

  const currentTeamId = currentTeam
    ? currentTeam.id
    : typeof localStorage !== "undefined"
      ? localStorage.getItem("currentTeamId")
      : null;

  const value = useMemo(
    () => ({
      teams: teams || [],
      currentTeam:
        (teams || []).find((team) => team.id === currentTeamId) ||
        (teams || [])[0],
      currentTeamId,
      isLoading: loading,
      setCurrentTeam,
    }),
    [teams, currentTeam, loading],
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};

export const useTeam = () => useContext(TeamContext);
