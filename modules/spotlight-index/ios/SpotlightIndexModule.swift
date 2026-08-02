import CoreSpotlight
import ExpoModulesCore

let spotlightDomainIdentifier = "cleanclip.entries"
let spotlightItemTapNotification = Notification.Name("CleanClipSpotlightItemTap")

// Holds a tap that arrived before JS attached its listener (cold start).
public final class SpotlightTapStore {
  public static var pendingId: String?
}

public class SpotlightIndexModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SpotlightIndex")

    Events("onSpotlightItemTap")

    OnCreate {
      NotificationCenter.default.addObserver(
        forName: spotlightItemTapNotification, object: nil, queue: .main
      ) { [weak self] notification in
        guard let self = self, let id = notification.userInfo?["id"] as? String else { return }
        self.sendEvent("onSpotlightItemTap", ["id": id])
      }
    }

    AsyncFunction("setEntries") { (items: [[String: String]], promise: Promise) in
      let index = CSSearchableIndex.default()
      index.deleteSearchableItems(withDomainIdentifiers: [spotlightDomainIdentifier]) { _ in
        let searchableItems: [CSSearchableItem] = items.compactMap { item in
          guard let id = item["id"], let title = item["title"], !title.isEmpty else { return nil }
          let attrs = CSSearchableItemAttributeSet(contentType: .text)
          attrs.title = title
          attrs.contentDescription = "CleanClip"
          let searchable = CSSearchableItem(
            uniqueIdentifier: id,
            domainIdentifier: spotlightDomainIdentifier,
            attributeSet: attrs
          )
          searchable.expirationDate = Date.distantFuture
          return searchable
        }
        guard !searchableItems.isEmpty else {
          promise.resolve(0)
          return
        }
        index.indexSearchableItems(searchableItems) { error in
          if let error = error {
            promise.reject("ERR_SPOTLIGHT_INDEX", error.localizedDescription)
          } else {
            promise.resolve(searchableItems.count)
          }
        }
      }
    }

    AsyncFunction("clearAll") { (promise: Promise) in
      CSSearchableIndex.default().deleteSearchableItems(withDomainIdentifiers: [spotlightDomainIdentifier]) { error in
        if let error = error {
          promise.reject("ERR_SPOTLIGHT_CLEAR", error.localizedDescription)
        } else {
          promise.resolve(nil)
        }
      }
    }

    AsyncFunction("consumePendingItemTap") { () -> String? in
      let id = SpotlightTapStore.pendingId
      SpotlightTapStore.pendingId = nil
      return id
    }
  }
}
