import React from 'react'
import { GameState, Tile } from '../../types/GameTypes'
import { TileImage } from '../TileImage'

interface ScoreResultModalProps {
  scoreResult: any
  gameState: GameState
  nextRoundReady: boolean
  onNextRound: () => void
  winnerId: string | null
  winnerHand: Tile[]
  winnerMelds: Tile[][]
}

export function ScoreResultModal({
  scoreResult,
  gameState,
  nextRoundReady,
  onNextRound,
  winnerId,
  winnerHand,
  winnerMelds,
}: ScoreResultModalProps) {
  if (!scoreResult) return null

  // 流局や引き分けなどのケース判定
  // isDraw フラグが明示的にtrueの場合のみ、引き分けとして扱う
  // そうでない場合は、scoreResult.validの値を使用して判定
  const isDrawOrAbort = scoreResult.isDraw === true
  const winnerName = winnerId
    ? (gameState?.players?.find((player: any) => player.userId === winnerId)?.playerName || winnerId)
    : null
  const hasWinnerTiles = winnerHand.length > 0 || winnerMelds.length > 0

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        backgroundColor: '#2d5016',
        padding: '20px',
        borderRadius: '0px',
        maxWidth: '90vw',
        width: '1200px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        border: '3px solid #ffffff',
      }}>
        {winnerName && !isDrawOrAbort && scoreResult.valid && hasWinnerTiles && (
          <div style={{
            marginBottom: '12px',
            padding: '12px',
            backgroundColor: '#3d6b20',
            borderRadius: '0px',
            border: '2px solid #ffffff',
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '8px',
            }}>
              勝者: {winnerName}
            </div>
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}>
              {winnerMelds.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {winnerMelds.map((meld, meldIdx) => (
                    <div key={`winner-meld-${meldIdx}`} style={{
                      display: 'flex',
                      gap: '1px',
                      padding: '6px',
                      backgroundColor: '#1a2e0a',
                      borderRadius: '0px',
                      border: '2px solid #ffffff',
                    }}>
                      {meld.map((tile, tileIdx) => (
                        <TileImage key={`winner-meld-${meldIdx}-${tileIdx}`} tile={tile} />
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '1px', flexWrap: 'wrap', alignItems: 'center' }}>
                {winnerHand.slice(0, winnerHand.length - 1).map((tile, idx) => (
                  <TileImage key={`winner-hand-${idx}`} tile={tile} />
                ))}
                {/* 和了牌を右端にスペースを空けて表示 */}
                {scoreResult.winningTile && (
                  <span style={{ display: 'flex', alignItems: 'center', marginLeft: '16px' }}>
                    <TileImage tile={scoreResult.winningTile} />
                  </span>
                )}
                {/* winningTileがなければ最後の牌を和了牌として表示 */}
                {!scoreResult.winningTile && winnerHand.length > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', marginLeft: '16px' }}>
                    <TileImage tile={winnerHand[winnerHand.length - 1]} />
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <h2 style={{ 
          marginTop: 0, 
          color: isDrawOrAbort ? '#ffcc66' : (scoreResult.valid ? '#90ee90' : '#ff6b6b'),
          textAlign: 'center',
          fontSize: '22px',
          marginBottom: '8px',
          fontWeight: 'bold',
        }}>
          {isDrawOrAbort 
            ? (scoreResult.scoreType?.includes('Draw') ? '流局' : (scoreResult.scoreType || 'ゲーム終了'))
            : (scoreResult.valid 
                ? `${winnerName} が${(scoreResult.winType || scoreResult.scoreType || '和了').replace('!', '')}で和了` 
                : '役なし')}
        </h2>
        
        {scoreResult.valid && !isDrawOrAbort && winnerName && (
          <div style={{
            textAlign: 'center',
            fontSize: '14px',
            color: '#e0e0e0',
            marginBottom: '15px',
            fontWeight: '500',
          }}>
            {(scoreResult.winType || '').includes('ロン') ? '対手の捨て牌をすぐに和了' : 'ツモで和了'}
          </div>
        )}
        
        {scoreResult.valid && !isDrawOrAbort ? (
          <>
            <div style={{
              marginTop: '15px',
              padding: '15px',
              backgroundColor: '#3d6b20',
              borderRadius: '0px',
              border: '2px solid #ffffff',
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#ffffff', fontSize: '16px' }}>役</h3>
              {scoreResult.yaku && scoreResult.yaku.length > 0 ? (
                <div style={{ fontSize: '14px' }}>
                  {scoreResult.yaku.map((y: any, idx: number) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: idx < scoreResult.yaku.length - 1 ? '1px solid #ffffff' : 'none',
                      color: '#ffffff',
                    }}>
                      <span style={{ fontWeight: 'bold' }}>{y.name}</span>
                      <span style={{ color: '#90ee90' }}>{y.han}飜</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#e0e0e0', fontStyle: 'italic', margin: 0, fontSize: '13px' }}>役なし</p>
              )}
            </div>

            <div style={{
              marginTop: '15px',
              padding: '15px',
              backgroundColor: '#1a2e0a',
              borderRadius: '0px',
              border: '2px solid #ffffff',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffcc66', marginBottom: '8px' }}>
                {scoreResult.score}点
              </div>
              {typeof scoreResult.riichiDeposits === 'number' && scoreResult.riichiDeposits > 0 && (
                <div style={{ fontSize: '14px', color: '#90ee90', marginBottom: '6px' }}>
                  供託 +{scoreResult.riichiDeposits.toLocaleString()}点
                </div>
              )}
              <div style={{ fontSize: '16px', color: '#e0e0e0', marginBottom: '5px' }}>
                {scoreResult.scoreType}
              </div>
              <div style={{ fontSize: '14px', color: '#a0a0a0' }}>
                {scoreResult.han}飜 {scoreResult.fu}符
              </div>
            </div>

            {scoreResult.calculation && (
              <div style={{
                marginTop: '15px',
                padding: '12px',
                backgroundColor: '#1a2e0a',
                borderRadius: '0px',
                border: '2px solid #ffffff',
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                color: '#e0e0e0',
                maxHeight: '200px',
                overflow: 'auto',
              }}>
                {scoreResult.calculation}
              </div>
            )}
          </>
        ) : isDrawOrAbort ? (
          <div style={{
            marginTop: '15px',
            padding: '15px',
            backgroundColor: '#3d2e0a',
            borderRadius: '0px',
            border: '2px solid #ffcc66',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '16px', color: '#ffcc66', margin: '10px 0' }}>
              {scoreResult.scoreType || 'ゲームが終了しました'}
            </p>
            <p style={{ fontSize: '14px', color: '#e0e0e0', margin: '10px 0' }}>
              (このラウンドは引き分けです)
            </p>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#e0e0e0', fontSize: '14px' }}>
            {scoreResult.error || '役がありません'}
          </p>
        )}

        <button
          onClick={onNextRound}
          disabled={nextRoundReady}
          style={{
            marginTop: '15px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            border: '2px solid #ffffff',
            borderRadius: '0px',
            backgroundColor: nextRoundReady ? '#555' : '#3d6b20',
            color: '#fff',
            cursor: nextRoundReady ? 'not-allowed' : 'pointer',
            width: '100%',
          }}
        >
          {nextRoundReady ? '準備完了' : '次の局へ'}
        </button>
      </div>
    </div>
  )
}
