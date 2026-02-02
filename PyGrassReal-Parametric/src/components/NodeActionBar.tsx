import React, { useEffect, useState } from 'react';
import { LogIn, Power, Copy, Info, Trash2 } from 'lucide-react';
import clsx from 'clsx';

interface NodeActionBarProps {
  selected: boolean;
  isPaused: boolean;
  onTogglePause: () => void;
  onDuplicate?: () => void;
  onInfo?: () => void;
  onDelete: () => void;
  canJoinGroup?: boolean;
  onJoinGroup?: () => void;
  canLeaveGroup?: boolean;
  onLeaveGroup?: () => void;
  onCluster?: () => void;
  pauseTitle?: string;
  duplicateTitle?: string;
  infoTitle?: string;
}

export const NodeActionBar: React.FC<NodeActionBarProps> = ({
  selected,
  isPaused,
  onTogglePause,
  onDuplicate,
  onInfo,
  onDelete,
  canJoinGroup,
  onJoinGroup,
  canLeaveGroup,
  onLeaveGroup,
  onCluster,
  pauseTitle,
  duplicateTitle,
  infoTitle,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!selected) {
      setIsMenuOpen(false);
    }
  }, [selected]);

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  };

  const handleActionClick = (callback?: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    callback?.();
    setIsMenuOpen(false);
  };

  const title = pauseTitle ?? (isPaused ? 'Resume Node' : 'Pause Node');
  const duplicateLabel = duplicateTitle ?? 'Duplicate Node';
  const infoLabel = infoTitle ?? 'Node Info';

  return (
    <div className="node-header-actions" onMouseDown={(e) => e.stopPropagation()}>
      {selected && (
        <div className="node-header-menu-wrapper">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={handleMenuToggle}
            title="Open menu"
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
            className="node-header-menu-button"
          >
            M
          </button>

          {isMenuOpen && (
            <>
              <div
                className="node-menu-backdrop"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                }}
              />
              <div onClick={(e) => e.stopPropagation()} className="node-menu-popup">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={handleActionClick(onTogglePause)}
                  title={title}
                  aria-pressed={isPaused}
                  className={clsx('node-menu-item', 'node-menu-item--power', { paused: isPaused })}
                >
                  <Power size={24} strokeWidth={2.6} color="#fff" />
                </button>

                {onDuplicate && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={handleActionClick(onDuplicate)}
                    title={duplicateLabel}
                    className="node-menu-item node-menu-item--duplicate"
                  >
                    <Copy size={22} strokeWidth={2.4} color="#fff" />
                  </button>
                )}

                {onInfo && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={handleActionClick(onInfo)}
                    title={infoLabel}
                    className="node-menu-item node-menu-item--info"
                  >
                    <Info size={22} strokeWidth={2.4} color="#fff" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {canJoinGroup && onJoinGroup && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onJoinGroup();
          }}
          style={{
            background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            padding: '4px',
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            marginRight: '0px',
            boxShadow: '0 2px 6px rgba(34, 197, 94, 0.4)',
            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(74, 222, 128, 0.6)';
            e.currentTarget.style.background = 'linear-gradient(135deg, #60f090 0%, #4ade80 100%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(34, 197, 94, 0.4)';
            e.currentTarget.style.background = 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)';
          }}
          title="Join Group"
        >
          <LogIn size={14} strokeWidth={2.5} />
        </button>
      )}

      {canLeaveGroup && onLeaveGroup && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLeaveGroup();
          }}
          style={{
            background: 'rgba(255, 165, 0, 0.3)',
            border: '1px solid rgba(255, 165, 0, 0.6)',
            borderRadius: '6px',
            padding: '4px',
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Leave Group"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M10 3H3v18h7M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      )}

      {onCluster && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCluster();
          }}
          style={{
            background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '6px',
            padding: '6px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.4px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          title="Edit component"
        >
          Cluster
        </button>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="node-header-delete-button"
        title="Delete Node"
      >
        <Trash2 size={16} strokeWidth={2.2} color="#fff" />
      </button>
    </div>
  );
};
