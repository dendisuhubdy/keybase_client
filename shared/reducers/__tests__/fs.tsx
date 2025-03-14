/* eslint-env jest */
import * as Types from '../../constants/types/fs'
import * as Constants from '../../constants/fs'
import * as FsGen from '../../actions/fs-gen'
import * as I from 'immutable'
import reducer, {_initialStateForTest} from '../fs'

jest.unmock('immutable')

const kbkbfstestPath = Types.stringToPath('/keybase/team/kbkbfstest')
const file0Path = Types.pathConcat(kbkbfstestPath, 'file0')
const folder0Path = Types.pathConcat(kbkbfstestPath, 'folder0')

const getFolderOrFail = (pathItems, path): Types.FolderPathItem => {
  const pathItem = pathItems.get(path)
  expect(pathItem).toBeTruthy()
  expect(pathItem ? pathItem.type : 'nope').toBe(Types.PathType.Folder)
  return pathItem && pathItem.type === Types.PathType.Folder ? pathItem : Constants.makeFolder()
}

const state0 = {
  ..._initialStateForTest,
  pathItems: I.Map({
    [file0Path || '']: Constants.makeFile({
      lastModifiedTimestamp: 1,
      lastWriter: 'foo',
      name: 'file0',
    }),
    [folder0Path || '']: Constants.makeFolder({
      children: I.Set(),
      name: 'folder0',
      progress: Types.ProgressType.Pending,
    }),
    [kbkbfstestPath || '']: Constants.makeFolder({
      children: I.Set(['file0', 'folder0']),
      name: 'kbkbfstest',
      prefetchStatus: Constants.makePrefetchInProgress(),
      progress: Types.ProgressType.Loaded,
    }),
  }),
}

describe('fs reducer', () => {
  test('pathItemLoaded: reuse old pathItem if new one remains the same', () => {
    const state1 = reducer(
      state0,
      FsGen.createPathItemLoaded({
        path: file0Path,
        pathItem: Constants.makeFile({
          lastModifiedTimestamp: 1,
          lastWriter: 'foo',
          name: 'file0',
        }),
      })
    )
    expect(state1.pathItems).toBe(state0.pathItems)
  })

  test('pathItemLoaded: pending folder should not over ride loaded children', () => {
    const state1 = reducer(
      state0,
      FsGen.createPathItemLoaded({
        path: kbkbfstestPath,
        pathItem: Constants.makeFolder({
          lastModifiedTimestamp: 1,
          name: 'kbkbfstest',
        }),
      })
    )
    expect(state1.pathItems).not.toBe(state0.pathItems)
    expect(getFolderOrFail(state1.pathItems, kbkbfstestPath).children).toBe(
      getFolderOrFail(state0.pathItems, kbkbfstestPath).children
    )
  })

  test('pathItemLoaded: reuse old pathItem if new folder remains the same', () => {
    const state1 = reducer(
      state0,
      FsGen.createPathItemLoaded({
        path: kbkbfstestPath,
        pathItem: Constants.makeFolder({
          children: I.Set(['file0', 'folder0']),
          name: 'kbkbfstest',
          prefetchStatus: Constants.makePrefetchInProgress(),
          progress: Types.ProgressType.Loaded,
        }),
      })
    )
    expect(state1.pathItems).toBe(state0.pathItems)
  })

  test('folderListLoaded: load folder0', () => {
    const state1 = reducer(
      state0,
      FsGen.createFolderListLoaded({
        path: folder0Path,
        pathItems: I.Map([
          [
            folder0Path,
            Constants.makeFolder({
              children: I.Set(['file1']),
              name: 'folder0',
              prefetchStatus: Constants.prefetchNotStarted,
              progress: Types.ProgressType.Loaded,
            }),
          ],
        ]),
      })
    )
    expect(state1.pathItems).not.toBe(state0.pathItems)
    expect(getFolderOrFail(state1.pathItems, folder0Path).children).toEqual(I.Set(['file1']))
    expect(getFolderOrFail(state1.pathItems, folder0Path).prefetchStatus).toBe(Constants.prefetchNotStarted)
  })

  test('folderListLoaded: folder0 prefetch complete', () => {
    const state1 = reducer(
      state0,
      FsGen.createFolderListLoaded({
        path: folder0Path,
        pathItems: I.Map([
          [
            folder0Path,
            Constants.makeFolder({
              name: 'folder0',
              prefetchStatus: Constants.prefetchComplete,
            }),
          ],
        ]),
      })
    )
    expect(state1.pathItems).not.toBe(state0.pathItems)
    expect(getFolderOrFail(state1.pathItems, folder0Path).prefetchStatus).toBe(Constants.prefetchComplete)
  })

  test('favorritesLoaded: reuse tlf', () => {
    const tlfFields = {
      conflictState: Constants.makeConflictStateNormalView({
        localViewTlfPaths: [
          Types.stringToPath('/keybase/private/bla (conflict 1)'),
          Types.stringToPath('/keybase/private/bla (conflict 2)'),
        ],
      }),
      isFavorite: true,
      isIgnored: true,
      isNew: true,
      name: 'foo',
      resetParticipants: ['foo', 'bar'],
      syncConfig: Constants.makeTlfSyncPartial({enabledPaths: [Constants.defaultPath]}),
      teamId: '123',
      tlfMtime: 123123123,
    }
    const state0 = {
      ..._initialStateForTest,
      tlfs: {
        ..._initialStateForTest.tlfs,
        private: new Map([
          [
            'foo',
            Constants.makeTlf({
              ...tlfFields,
              syncConfig: Constants.makeTlfSyncPartial({enabledPaths: [Constants.defaultPath]}),
            }),
          ],
        ]),
      },
    }
    const state1 = reducer(
      state0,
      FsGen.createFavoritesLoaded({
        private: new Map([['foo', Constants.makeTlf(tlfFields)]]),
        public: new Map(),
        team: new Map(),
      })
    )
    expect(state1.tlfs.private.get('foo')).toBe(state0.tlfs.private.get('foo'))
  })
})
