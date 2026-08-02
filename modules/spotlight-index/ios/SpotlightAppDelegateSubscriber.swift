import CoreSpotlight
import ExpoModulesCore

public class SpotlightAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    guard userActivity.activityType == CSSearchableItemActionType,
          let id = userActivity.userInfo?[CSSearchableItemActivityIdentifier] as? String else {
      return false
    }
    SpotlightTapStore.pendingId = id
    NotificationCenter.default.post(
      name: spotlightItemTapNotification, object: nil, userInfo: ["id": id]
    )
    return true
  }
}
