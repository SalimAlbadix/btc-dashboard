'use client';

import { useState, useEffect } from 'react';
import { GeopoliticalEvent } from '@/lib/types';
import { getUpcomingEvents, getEvents, saveEvent, deleteEvent } from '@/lib/storage';
import { format, formatDistanceToNow } from 'date-fns';

const EVENT_TYPE_LABELS: Record<GeopoliticalEvent['type'], string> = {
  fed: 'Fed Decision',
  cpi: 'CPI Release',
  political: 'Political Event',
  etf: 'ETF News',
  other: 'Event',
};

function EventIcon({ type }: { type: GeopoliticalEvent['type'] }) {
  const icons: Record<GeopoliticalEvent['type'], string> = {
    fed: '🏛️',
    cpi: '📊',
    political: '🌐',
    etf: '📈',
    other: '⚡',
  };
  return <span>{icons[type]}</span>;
}

export default function GeopoliticalBanner() {
  const [upcoming, setUpcoming] = useState<GeopoliticalEvent[]>([]);
  const [allEvents, setAllEvents] = useState<GeopoliticalEvent[]>([]);
  const [showManager, setShowManager] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState<GeopoliticalEvent['type']>('other');

  useEffect(() => {
    const refresh = () => {
      setUpcoming(getUpcomingEvents());
      setAllEvents(getEvents());
    };
    refresh();
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, []);

  const handleAdd = () => {
    if (!newTitle || !newDate) return;
    const event: GeopoliticalEvent = {
      id: `event_${Date.now()}`,
      title: newTitle,
      date: new Date(newDate).getTime(),
      type: newType,
      impact: 'high',
    };
    saveEvent(event);
    setAllEvents(getEvents());
    setUpcoming(getUpcomingEvents());
    setNewTitle('');
    setNewDate('');
  };

  const handleDelete = (id: string) => {
    deleteEvent(id);
    setAllEvents(getEvents());
    setUpcoming(getUpcomingEvents());
  };

  if (upcoming.length === 0 && !showManager) {
    return (
      <button
        onClick={() => setShowManager(true)}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
      >
        <span>📅</span> Manage geopolitical events
      </button>
    );
  }

  return (
    <div>
      {upcoming.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-3">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-amber-900 text-sm">
                Major Event{upcoming.length > 1 ? 's' : ''} in Next 48 Hours
              </p>
              <p className="text-xs text-amber-700 mt-0.5 font-medium">
                Reduce position size by 50% — volatility expected
              </p>
              <div className="mt-2 space-y-1.5">
                {upcoming.map(e => (
                  <div key={e.id} className="flex items-center gap-2 text-sm text-amber-800">
                    <EventIcon type={e.type} />
                    <span className="font-medium">{e.title}</span>
                    <span className="text-amber-600 text-xs ml-auto flex-shrink-0">
                      {formatDistanceToNow(e.date, { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowManager(v => !v)}
            className="mt-3 text-xs text-amber-600 hover:text-amber-800 font-medium"
          >
            {showManager ? 'Hide event manager' : 'Manage events →'}
          </button>
        </div>
      )}

      {showManager && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Upcoming Events</h3>
            <button onClick={() => setShowManager(false)} className="text-gray-400 text-xl leading-none">×</button>
          </div>

          {/* Event list */}
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {allEvents
              .sort((a, b) => a.date - b.date)
              .map(e => (
                <div key={e.id} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-lg">
                  <EventIcon type={e.type} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{e.title}</p>
                    <p className="text-xs text-gray-500">
                      {format(e.date, 'MMM d, yyyy HH:mm')} · {EVENT_TYPE_LABELS[e.type]}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
            {allEvents.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No events scheduled</p>
            )}
          </div>

          {/* Add event */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">Add Event</p>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Event name..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-orange-400"
            />
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              />
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as GeopoliticalEvent['type'])}
                className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-orange-400"
              >
                <option value="fed">Fed</option>
                <option value="cpi">CPI</option>
                <option value="political">Political</option>
                <option value="etf">ETF</option>
                <option value="other">Other</option>
              </select>
              <button
                onClick={handleAdd}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {upcoming.length === 0 && showManager && null}
    </div>
  );
}
