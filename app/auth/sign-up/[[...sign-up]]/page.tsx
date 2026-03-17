import { SignUp } from '@clerk/nextjs'

export default function Page() {
  // return <SignUp fallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL} />
  // return <SignUp fallbackRedirectUrl="/admin"/>
  return (
    <SignUp/>
  )
}