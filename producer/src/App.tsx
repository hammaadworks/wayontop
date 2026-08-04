import { useState } from 'react';
import { PermissionGate } from '@wayontop/ui/components/PermissionGate';
import { useVenues } from './hooks/useVenues';
import { VenueSelector } from './components/VenueSelector';
import { MapEditor } from './components/MapEditor';
import type { Venue } from './hooks/useVenues';

function MainApp() {
  const { venues, loadingVenues, createVenue, updateVenue, deleteVenue } = useVenues();
  const [currentVenue, setCurrentVenue] = useState<Venue | null>(null);

  if (!currentVenue) {
    return (
      <VenueSelector
        venues={venues}
        loadingVenues={loadingVenues}
        onSelectVenue={setCurrentVenue}
        onCreateVenue={createVenue}
        onUpdateVenue={updateVenue}
        onDeleteVenue={deleteVenue}
      />
    );
  }

  return <MapEditor currentVenue={currentVenue} onBack={() => setCurrentVenue(null)} />;
}

export default function App() {
  return (
    <PermissionGate>
      <MainApp />
    </PermissionGate>
  );
}
